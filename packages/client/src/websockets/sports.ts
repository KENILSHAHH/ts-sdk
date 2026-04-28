import {
  type SportsEvent,
  SportsResultEventSchema,
} from '@polymarket/bindings/subscriptions';
import { pushable } from 'it-pushable';
import type {
  SportsSubscription,
  SubscriptionHandle,
} from '../actions/subscriptions';
import {
  closeSocket,
  ReconnectScheduler,
  WebSocketConnection,
} from './lifecycle';
import {
  SubscriptionRegistry,
  type SubscriptionRegistryEntry,
} from './registry';
import type { WebSocketManager } from './types';

type SportsSubscriptionEntry = SubscriptionRegistryEntry<
  SportsSubscription,
  SportsEvent
>;

export type SportsWebSocketManagerOptions = {
  url: string;
};

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
  #closing: Promise<void> | undefined;
  readonly #connection = new WebSocketConnection();
  readonly #reconnectScheduler: ReconnectScheduler;
  readonly #subscriptions = new SubscriptionRegistry<
    SportsSubscription,
    SportsEvent
  >();

  constructor(options: SportsWebSocketManagerOptions) {
    this.#url = options.url;
    this.#reconnectScheduler = new ReconnectScheduler({
      baseDelayMs: RECONNECT_BASE_DELAY_MS,
      maxDelayMs: RECONNECT_MAX_DELAY_MS,
    });
  }

  async subscribe(
    subscription: SportsSubscription,
  ): Promise<SubscriptionHandle<SportsEvent>> {
    const entry: SportsSubscriptionEntry = {
      subscription,
      subscriber: {
        queue: pushable<SportsEvent>({ objectMode: true }),
      },
    };

    await this.#registerSubscriber(entry);
    return this.#createHandle(entry);
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(entry: SportsSubscriptionEntry): Promise<void> {
    this.#subscriptions.add(entry);

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
    this.#subscriptions.remove(entry);

    if (!this.#subscriptions.hasActiveSubscriptions()) {
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
    this.#reconnectScheduler.stop();
    this.#subscriptions.endAll();

    await closeSocket(await this.#connection.takeCurrent());
  }

  #ensureSocket(): Promise<WebSocket> {
    return this.#connection.ensure(() => this.#openSocket());
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
    this.#connection.markOpen(socket);
    this.#reconnectScheduler.resetBackoff();
  }

  #onSocketMessage(socket: WebSocket, event: MessageEvent): void {
    if (!this.#connection.isCurrent(socket)) return;

    const data = String(event.data);
    if (data.toLowerCase() === 'ping') {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('pong');
      }
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
    this.#subscriptions.dispatch(parsed.data);
  }

  #onSocketClose(socket: WebSocket): void {
    if (this.#connection.hasDifferentCurrent(socket)) return;
    this.#connection.clearSocket();
    if (this.#subscriptions.hasActiveSubscriptions()) {
      this.#scheduleReconnect();
    }
  }

  #onSocketError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  #scheduleReconnect(): void {
    this.#reconnectScheduler.schedule({
      reconnect: () => this.#ensureSocket(),
      shouldReconnect: () => this.#subscriptions.hasActiveSubscriptions(),
    });
  }
}
