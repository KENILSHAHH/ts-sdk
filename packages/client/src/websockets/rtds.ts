import {
  type CommentsEvent,
  type CryptoPricesEvent,
  type EquityPricesEvent,
  RealtimeEventSchema,
} from '@polymarket/bindings/subscriptions';
import {
  invariant,
  setNonBlockingInterval,
  setNonBlockingTimeout,
} from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import type {
  CommentsSubscription,
  CryptoPricesSubscription,
  EquityPricesSubscription,
  SubscriptionHandle,
} from '../actions/subscriptions';
import type { WebSocketManager } from './types';

type RtdsSpec =
  | CommentsSubscription
  | CryptoPricesSubscription
  | EquityPricesSubscription;

type RtdsEvent = CommentsEvent | CryptoPricesEvent | EquityPricesEvent;

type RtdsSubscriber = {
  matches: (event: RtdsEvent) => boolean;
  queue: Pushable<RtdsEvent>;
};

type RtdsSubscriptionEntry = {
  subscription: RtdsSpec;
  subscriber: RtdsSubscriber;
};

type RtdsServerSubscription = {
  key: string;
  topic: string;
  type: string;
};

// RTDS requires clients to send `PING` roughly every 5 seconds to keep the
// socket from being idled out by the server.
const HEARTBEAT_INTERVAL_MS = 5_000;
const RECONNECT_BASE_DELAY_MS = 250;
const RECONNECT_MAX_DELAY_MS = 30_000;

class RtdsSubscriptionRegistry {
  readonly #entries = new Set<RtdsSubscriptionEntry>();

  add(entry: RtdsSubscriptionEntry): RtdsServerSubscription[] {
    const activeBefore = this.#activeServerSubscriptionsByKey();
    this.#entries.add(entry);
    const activeAfter = this.#activeServerSubscriptionsByKey();
    return serverSubscriptionsAdded(activeBefore, activeAfter);
  }

  remove(entry: RtdsSubscriptionEntry): RtdsServerSubscription[] {
    const activeBefore = this.#activeServerSubscriptionsByKey();
    this.#entries.delete(entry);
    entry.subscriber.queue.end();
    const activeAfter = this.#activeServerSubscriptionsByKey();
    return serverSubscriptionsRemoved(activeBefore, activeAfter);
  }

  dispatch(event: RtdsEvent): void {
    for (const { subscriber } of this.#entries) {
      if (subscriber.matches(event)) {
        subscriber.queue.push(event);
      }
    }
  }

  activeServerSubscriptions(): RtdsServerSubscription[] {
    return Array.from(this.#activeServerSubscriptionsByKey().values());
  }

  hasActiveSubscriptions(): boolean {
    return this.#entries.size > 0;
  }

  endAll(error?: Error): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.end(error);
    }
    this.#entries.clear();
  }

  #activeServerSubscriptionsByKey(): Map<string, RtdsServerSubscription> {
    const activeByKey = new Map<string, RtdsServerSubscription>();
    for (const { subscription } of this.#entries) {
      for (const serverSubscription of serverSubscriptionsFor(subscription)) {
        if (!activeByKey.has(serverSubscription.key)) {
          activeByKey.set(serverSubscription.key, serverSubscription);
        }
      }
    }
    return activeByKey;
  }
}

/**
 * Realtime Data Service (RTDS) WebSocket manager.
 *
 * Implements {@link WebSocketManager} for the comments, crypto prices, and
 * equity prices topics multiplexed over a single shared upstream socket
 * opened lazily on the first subscribe.
 *
 * TODO(followup): add a data-staleness watchdog that forces reconnect when no
 * messages arrive for a configured interval.
 */
export class RtdsWebSocketManager
  implements WebSocketManager<RtdsSpec, RtdsEvent>
{
  readonly #url: string;
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocket> | undefined;
  #closing: Promise<void> | undefined;
  #heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempt = 0;
  readonly #subscriptions = new RtdsSubscriptionRegistry();

  constructor(url: string) {
    this.#url = url;
  }

  async subscribe(
    subscription: RtdsSpec,
  ): Promise<SubscriptionHandle<RtdsEvent>> {
    const entry: RtdsSubscriptionEntry = {
      subscription,
      subscriber: {
        matches: matcherFor(subscription),
        queue: pushable<RtdsEvent>({ objectMode: true }),
      },
    };
    await this.#registerSubscriber(entry);
    return this.#createHandle(entry);
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(entry: RtdsSubscriptionEntry): Promise<void> {
    const shouldSendIncrementalSubscribe = this.#hasOpenSocket();
    const subscriptionsToOpen = this.#subscriptions.add(entry);

    let socket: WebSocket;
    try {
      socket = await this.#ensureSocket();
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
    if (shouldSendIncrementalSubscribe) {
      this.#sendSubscribeFrame(socket, subscriptionsToOpen);
    }
  }

  #createHandle(entry: RtdsSubscriptionEntry): SubscriptionHandle<RtdsEvent> {
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

  async #closeSubscriber(entry: RtdsSubscriptionEntry): Promise<void> {
    const subscriptionsToClose = this.#subscriptions.remove(entry);
    this.#sendUnsubscribeFrame(subscriptionsToClose);
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
    this.#stopHeartbeat();
    this.#stopReconnect();
    this.#subscriptions.endAll();

    const socket = await this.#takeCurrentSocket();
    if (socket === undefined || socket.readyState === WebSocket.CLOSED) {
      return;
    }
    if (socket.readyState === WebSocket.CLOSING) {
      await waitForSocketClose(socket);
      return;
    }

    await new Promise<void>((resolve) => {
      socket.addEventListener('close', () => resolve(), { once: true });
      socket.close();
    });
  }

  async #takeCurrentSocket(): Promise<WebSocket | undefined> {
    const socket = this.#socket;
    const connecting = this.#connecting;

    this.#socket = undefined;
    this.#connecting = undefined;

    if (socket !== undefined) return socket;
    return connecting?.catch(() => undefined);
  }

  #hasOpenSocket(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
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
        reject(new Error('RTDS WebSocket failed to open.'));
      };

      socket.addEventListener('open', onOpen, { once: true });
      socket.addEventListener('error', onOpenError, { once: true });
      socket.addEventListener('message', (event) => this.#dispatch(event));
      socket.addEventListener('close', () => this.#onSocketClose(socket));
      socket.addEventListener('error', () => this.#onSocketError());
    });
  }

  #onSocketOpen(socket: WebSocket): void {
    this.#socket = socket;
    this.#connecting = undefined;
    this.#resetReconnectBackoff();
    this.#startHeartbeat(socket);
    this.#resubscribeActiveServerEntries(socket);
  }

  #dispatch(event: MessageEvent): void {
    let raw: unknown;
    try {
      raw = JSON.parse(String(event.data));
    } catch {
      return;
    }
    const parsed = RealtimeEventSchema.safeParse(raw);
    if (!parsed.success) return;
    this.#subscriptions.dispatch(parsed.data);
  }

  #onSocketClose(socket: WebSocket): void {
    if (this.#socket !== undefined && this.#socket !== socket) return;
    this.#stopHeartbeat();
    this.#socket = undefined;
    if (this.#subscriptions.hasActiveSubscriptions()) {
      this.#scheduleReconnect();
    }
  }

  #onSocketError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  // Heartbeat.

  #startHeartbeat(socket: WebSocket): void {
    this.#stopHeartbeat();
    this.#heartbeatTimer = setNonBlockingInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('PING');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  #stopHeartbeat(): void {
    if (this.#heartbeatTimer !== undefined) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = undefined;
    }
  }

  // RTDS subscribe/unsubscribe frames.

  #resubscribeActiveServerEntries(socket: WebSocket): void {
    this.#sendSubscribeFrame(
      socket,
      this.#subscriptions.activeServerSubscriptions(),
    );
  }

  #sendSubscribeFrame(
    socket: WebSocket,
    subscriptions: readonly RtdsServerSubscription[],
  ): void {
    if (subscriptions.length === 0 || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(buildSubscribeMessage(subscriptions)));
  }

  #sendUnsubscribeFrame(
    subscriptions: readonly RtdsServerSubscription[],
  ): void {
    const socket = this.#socket;
    if (subscriptions.length === 0 || socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(buildUnsubscribeMessage(subscriptions)));
  }

  // Reconnect.

  #scheduleReconnect(): void {
    if (
      this.#reconnectTimer !== undefined ||
      this.#connecting !== undefined ||
      !this.#subscriptions.hasActiveSubscriptions()
    ) {
      return;
    }
    const delay = reconnectDelay(this.#reconnectAttempt);
    this.#reconnectAttempt += 1;
    this.#reconnectTimer = setNonBlockingTimeout(() => {
      this.#reconnectTimer = undefined;
      void this.#reconnect();
    }, delay);
  }

  async #reconnect(): Promise<void> {
    if (!this.#subscriptions.hasActiveSubscriptions()) return;
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

function reconnectDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** attempt,
    RECONNECT_MAX_DELAY_MS,
  );
  return Math.random() * exponentialDelay;
}

function serverSubscriptionsAdded(
  before: ReadonlyMap<string, RtdsServerSubscription>,
  after: ReadonlyMap<string, RtdsServerSubscription>,
): RtdsServerSubscription[] {
  return Array.from(after).flatMap(([key, subscription]) =>
    before.has(key) ? [] : [subscription],
  );
}

function serverSubscriptionsRemoved(
  before: ReadonlyMap<string, RtdsServerSubscription>,
  after: ReadonlyMap<string, RtdsServerSubscription>,
): RtdsServerSubscription[] {
  return Array.from(before).flatMap(([key, subscription]) =>
    after.has(key) ? [] : [subscription],
  );
}

function waitForSocketClose(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    socket.addEventListener('close', () => resolve(), { once: true });
  });
}

function buildSubscribeMessage(
  subscriptions: readonly RtdsServerSubscription[],
): unknown {
  return {
    action: 'subscribe',
    subscriptions: subscriptions.map(({ topic, type }) => ({ topic, type })),
  };
}

function buildUnsubscribeMessage(
  subscriptions: readonly RtdsServerSubscription[],
): unknown {
  return {
    action: 'unsubscribe',
    subscriptions: subscriptions.map(({ topic, type }) => ({ topic, type })),
  };
}

function serverSubscriptionsFor(
  subscription: RtdsSpec,
): RtdsServerSubscription[] {
  switch (subscription.topic) {
    case 'comments':
      // RTDS tracks subscription state per (topic, type): different comment
      // event types coexist independently on the same socket, so one entry
      // per requested type. No server-side filters — any narrowing by
      // parentEntityID/parentEntityType happens client-side via matcherFor.
      return (subscription.types ?? ['comment_created']).map((type) =>
        serverSubscription('comments', type),
      );
    case 'prices.crypto.binance':
      // Subscribe broadly and filter client-side. Sending a second subscribe
      // frame with a different `filters` value on the same socket causes the
      // server to replace the prior subscription rather than add one, so
      // multiple subscribers on the same manager cannot share a socket while
      // using server-side filters. See docs/api-boundary-notes.md.
      return [serverSubscription('crypto_prices', 'update')];
    case 'prices.crypto.chainlink':
      // RTDS tracks one filter per topic per connection, so a second subscribe
      // with a different filter replaces the first. Subscribe broadly and
      // filter client-side — see docs/api-boundary-notes.md.
      return [serverSubscription('crypto_prices_chainlink', 'update')];
    case 'prices.equity.pyth':
      // Same per-topic replace-on-resubscribe constraint as crypto_prices. A
      // single unfiltered subscribe covers every active equity symbol; the
      // client-side matcher narrows to the caller's requested symbol.
      return [serverSubscription('equity_prices', 'update')];
    default: {
      const neverSpec: never = subscription;
      invariant(false, `Unknown RTDS topic: ${String(neverSpec)}`);
    }
  }
}

function serverSubscription(
  topic: string,
  type: string,
): RtdsServerSubscription {
  return {
    key: `${topic}:${type}`,
    topic,
    type,
  };
}

function matcherFor(subscription: RtdsSpec): (event: RtdsEvent) => boolean {
  switch (subscription.topic) {
    case 'comments':
      // All `comments` narrowing happens client-side because the RTDS server
      // uses opaque substring matching on `filters` rather than structured
      // fields. When the caller sets `parentEntityId` or `parentEntityType`,
      // reaction events are dropped: their payloads carry only `commentID`,
      // not the parent context, so we can't verify the filter on them. Rule:
      // if a filter can't be verified on an event, the event doesn't match.
      // See docs/api-boundary-notes.md.
      return (event) => {
        if (event.topic !== 'comments') return false;
        if (
          subscription.types !== undefined &&
          subscription.types.length > 0 &&
          !subscription.types.includes(event.type)
        ) {
          return false;
        }
        const hasParentFilter =
          subscription.parentEntityId !== undefined ||
          subscription.parentEntityType !== undefined;
        if (hasParentFilter) {
          const carriesParentContext =
            event.type === 'comment_created' ||
            event.type === 'comment_removed';
          if (!carriesParentContext) return false;
          if (
            subscription.parentEntityId !== undefined &&
            event.payload.parentEntityID !== subscription.parentEntityId
          ) {
            return false;
          }
          if (
            subscription.parentEntityType !== undefined &&
            event.payload.parentEntityType !== subscription.parentEntityType
          ) {
            return false;
          }
        }
        return true;
      };
    case 'prices.crypto.binance':
      return (event) =>
        event.topic === 'prices.crypto.binance' &&
        (subscription.symbols === undefined ||
          subscription.symbols.length === 0 ||
          subscription.symbols.includes(event.payload.symbol));
    case 'prices.crypto.chainlink':
      return (event) =>
        event.topic === 'prices.crypto.chainlink' &&
        (subscription.symbols === undefined ||
          subscription.symbols.length === 0 ||
          subscription.symbols.includes(event.payload.symbol));
    case 'prices.equity.pyth':
      // RTDS emits every event kind for a topic regardless of the `type` value
      // in the subscribe frame, so the caller's `types` filter must be
      // enforced client-side here.
      return (event) =>
        event.topic === 'prices.equity.pyth' &&
        event.payload.symbol.toLowerCase() ===
          subscription.symbol.toLowerCase() &&
        (subscription.types === undefined ||
          subscription.types.length === 0 ||
          subscription.types.includes(event.type));
    default: {
      const neverSpec: never = subscription;
      invariant(false, `Unknown RTDS topic: ${String(neverSpec)}`);
    }
  }
}
