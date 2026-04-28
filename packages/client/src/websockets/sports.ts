import {
  type SportsEvent,
  SportsResultEventSchema,
} from '@polymarket/bindings/subscriptions';
import type {
  SportsSubscription,
  SubscriptionHandle,
} from '../actions/subscriptions';
import { createSubscriptionHandle } from './handle';
import {
  ReconnectScheduler,
  WebSocketConnection,
  type WebSocketConnectionResult,
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
    const { entry } = this.#subscriptions.add(subscription);

    await this.#registerSubscriber(entry);
    return createSubscriptionHandle(entry.subscriber.queue, () =>
      this.#closeSubscriber(entry),
    );
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(entry: SportsSubscriptionEntry): Promise<void> {
    try {
      await this.#ensureSocket();
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
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

    await this.#connection.close();
  }

  #ensureSocket(): Promise<WebSocketConnectionResult> {
    return this.#connection.connect({
      onClose: () => this.#onSocketClose(),
      onError: () => this.#onSocketError(),
      onMessage: (event) => this.#onSocketMessage(event),
      onOpen: () => this.#onSocketOpen(),
      openErrorMessage: 'Sports WebSocket failed to open.',
      url: this.#url,
    });
  }

  #onSocketOpen(): void {
    this.#reconnectScheduler.resetBackoff();
  }

  #onSocketMessage(event: MessageEvent): void {
    const data = String(event.data);
    if (data.toLowerCase() === 'ping') {
      this.#connection.sendIfOpen('pong');
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

  #onSocketClose(): void {
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
