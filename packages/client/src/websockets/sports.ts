import {
  type SportsEvent,
  SportsResultEventSchema,
} from '@polymarket/bindings/subscriptions';
import { setNonBlockingTimeout } from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import type {
  SportsSubscription,
  SubscriptionHandle,
} from '../actions/subscriptions';
import { reconnectDelay, waitForSocketClose } from './lifecycle';
import { StalenessWatchdog } from './staleness';
import type { WebSocketManager } from './types';

type SportsSubscriptionEntry = {
  subscriber: SportsSubscriber;
};

type SportsSubscriber = {
  queue: Pushable<SportsEvent>;
};

export type SportsWebSocketManagerOptions = {
  url: string;
};

const STALENESS_INTERVAL_MS = 30_000;
const RECONNECT_BASE_DELAY_MS = 250;
const RECONNECT_MAX_DELAY_MS = 30_000;

/**
 * Sports WebSocket manager.
 *
 * The sports stream starts sending events immediately after connection and does
 * not require a subscribe frame. The server sends `ping`; clients must reply
 * with `pong` to keep the socket alive.
 */
export class SportsWebSocketManager
  implements WebSocketManager<SportsSubscription, SportsEvent>
{
  readonly #url: string;
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocket> | undefined;
  #closing: Promise<void> | undefined;
  readonly #stalenessWatchdog: StalenessWatchdog;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempt = 0;
  readonly #entries = new Set<SportsSubscriptionEntry>();

  constructor(options: SportsWebSocketManagerOptions) {
    this.#url = options.url;
    this.#stalenessWatchdog = new StalenessWatchdog({
      intervalMs: STALENESS_INTERVAL_MS,
      onStale: () => this.#forceReconnect(),
    });
  }

  async subscribe(
    _subscription: SportsSubscription,
  ): Promise<SubscriptionHandle<SportsEvent>> {
    const entry: SportsSubscriptionEntry = {
      subscriber: {
        queue: pushable<SportsEvent>({ objectMode: true }),
      },
    };

    await this.#registerSubscriber(entry);
    return this.#createHandle(entry);
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(entry: SportsSubscriptionEntry): Promise<void> {
    this.#entries.add(entry);

    try {
      await this.#ensureSocket();
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
  }

  #createHandle(
    entry: SportsSubscriptionEntry,
  ): SubscriptionHandle<SportsEvent> {
    let closing: Promise<void> | undefined;
    return {
      close: () => {
        if (closing === undefined) {
          closing = this.#closeSubscriber(entry);
        }
        return closing;
      },
      [Symbol.asyncIterator]() {
        return entry.subscriber.queue[Symbol.asyncIterator]();
      },
    };
  }

  async #closeSubscriber(entry: SportsSubscriptionEntry): Promise<void> {
    this.#entries.delete(entry);
    entry.subscriber.queue.end();

    if (this.#entries.size === 0) {
      await this.close();
    }
  }

  // Socket lifecycle.

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown().finally(() => {
        this.#closing = undefined;
      });
    }
    await this.#closing;
  }

  async #shutdown(): Promise<void> {
    this.#stopStalenessWatchdog();
    this.#stopReconnect();
    this.#endSubscribers();

    const socket = await this.#takeCurrentSocket();
    if (socket === undefined || socket.readyState === WebSocket.CLOSED) return;
    if (socket.readyState === WebSocket.CLOSING) {
      await waitForSocketClose(socket);
      return;
    }

    await new Promise<void>((resolve) => {
      socket.addEventListener('close', () => resolve(), { once: true });
      socket.close();
    });
  }

  #endSubscribers(error?: Error): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.end(error);
    }
    this.#entries.clear();
  }

  async #takeCurrentSocket(): Promise<WebSocket | undefined> {
    const socket = this.#socket;
    const connecting = this.#connecting;

    this.#socket = undefined;
    this.#connecting = undefined;

    if (socket !== undefined) return socket;
    return connecting?.catch(() => undefined);
  }

  #ensureSocket(): Promise<WebSocket> {
    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(socket);
    }
    this.#socket = undefined;
    if (this.#connecting !== undefined) return this.#connecting;

    this.#connecting = this.#openSocket();
    return this.#connecting;
  }

  #openSocket(): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.#url);

      const onOpen = () => {
        socket.removeEventListener('error', onOpenError);
        this.#onSocketOpen(socket);
        resolve(socket);
      };
      const onOpenError = () => {
        socket.removeEventListener('open', onOpen);
        this.#connecting = undefined;
        reject(new Error('Sports WebSocket failed to open.'));
      };

      socket.addEventListener('open', onOpen, { once: true });
      socket.addEventListener('error', onOpenError, { once: true });
      socket.addEventListener('message', (event) =>
        this.#onSocketMessage(socket, event),
      );
      socket.addEventListener('close', () => this.#onSocketClose(socket));
      socket.addEventListener('error', () => this.#onSocketError());
    });
  }

  #onSocketOpen(socket: WebSocket): void {
    this.#socket = socket;
    this.#connecting = undefined;
    this.#resetReconnectBackoff();
    this.#startStalenessWatchdog();
  }

  #onSocketMessage(socket: WebSocket, event: MessageEvent): void {
    if (this.#socket !== socket) return;

    const data = String(event.data);
    if (data.toLowerCase() === 'ping') {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('pong');
      }
      this.#markSocketFresh();
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      return;
    }

    const parsed = SportsResultEventSchema.safeParse(raw);
    if (!parsed.success) return;
    this.#markSocketFresh();
    this.#dispatch(parsed.data);
  }

  #dispatch(event: SportsEvent): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.push(event);
    }
  }

  #onSocketClose(socket: WebSocket): void {
    if (this.#socket !== undefined && this.#socket !== socket) return;
    this.#stopStalenessWatchdog();
    this.#socket = undefined;
    if (this.#entries.size > 0) {
      this.#scheduleReconnect();
    }
  }

  #onSocketError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  // Data staleness watchdog.

  #startStalenessWatchdog(): void {
    this.#stalenessWatchdog.start();
  }

  #markSocketFresh(): void {
    this.#stalenessWatchdog.markFresh();
  }

  #stopStalenessWatchdog(): void {
    this.#stalenessWatchdog.stop();
  }

  #forceReconnect(): void {
    const socket = this.#socket;
    this.#stopStalenessWatchdog();
    this.#socket = undefined;

    if (
      socket !== undefined &&
      socket.readyState !== WebSocket.CLOSING &&
      socket.readyState !== WebSocket.CLOSED
    ) {
      socket.close();
    }
    if (this.#entries.size > 0) {
      this.#scheduleReconnect();
    }
  }

  // Reconnect.

  #scheduleReconnect(): void {
    if (
      this.#reconnectTimer !== undefined ||
      this.#connecting !== undefined ||
      this.#entries.size === 0
    ) {
      return;
    }
    const delay = reconnectDelay(this.#reconnectAttempt, {
      baseMs: RECONNECT_BASE_DELAY_MS,
      maxMs: RECONNECT_MAX_DELAY_MS,
    });
    this.#reconnectAttempt += 1;
    this.#reconnectTimer = setNonBlockingTimeout(() => {
      this.#reconnectTimer = undefined;
      void this.#reconnect();
    }, delay);
  }

  async #reconnect(): Promise<void> {
    if (this.#entries.size === 0) return;
    try {
      await this.#ensureSocket();
    } catch {
      this.#scheduleReconnect();
    }
  }

  #stopReconnect(): void {
    if (this.#reconnectTimer !== undefined) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = undefined;
    }
  }

  #resetReconnectBackoff(): void {
    this.#reconnectAttempt = 0;
  }
}
