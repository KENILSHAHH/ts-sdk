import {
  type CommentsEvent,
  type CryptoPricesEvent,
  type EquityPricesEvent,
  RealtimeEventSchema,
} from '@polymarket/bindings/subscriptions';
import { invariant, setNonBlockingInterval } from '@polymarket/types';
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

type RtdsTopic = RtdsSpec['topic'];

type RtdsEvent = CommentsEvent | CryptoPricesEvent | EquityPricesEvent;

type RtdsSubscriber = {
  matches: (event: RtdsEvent) => boolean;
  queue: Pushable<RtdsEvent>;
};

// RTDS requires clients to send `PING` roughly every 5 seconds to keep the
// socket from being idled out by the server.
const HEARTBEAT_INTERVAL_MS = 5_000;

/**
 * Realtime Data Service (RTDS) WebSocket manager.
 *
 * Implements {@link WebSocketManager} for the comments, crypto prices, and
 * equity prices topics multiplexed over a single shared upstream socket
 * opened lazily on the first subscribe.
 *
 * TODO(followup):
 *  - 5-second PING heartbeat to keep the shared socket alive
 *  - refcount handle lifecycle: send unsubscribe frames when individual
 *    handles close, and close the socket when the last handle closes
 *  - manager-level close() to terminate the socket and end all handles
 *  - reconnect + resubscribe on unexpected socket drop
 */
export class RtdsWebSocketManager
  implements WebSocketManager<RtdsSpec, RtdsEvent>
{
  readonly #url: string;
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocket> | undefined;
  #heartbeat: ReturnType<typeof setInterval> | undefined;
  // Subscribers grouped by topic. The map both tracks which topics currently
  // have a server-side subscription (key presence) and the set of per-handle
  // queues receiving events for that topic (value).
  readonly #subscribersByTopic = new Map<RtdsTopic, Set<RtdsSubscriber>>();

  constructor(url: string) {
    this.#url = url;
  }

  async subscribe(
    subscription: RtdsSpec,
  ): Promise<SubscriptionHandle<RtdsEvent>> {
    const subscriber: RtdsSubscriber = {
      matches: matcherFor(subscription),
      queue: pushable<RtdsEvent>({ objectMode: true }),
    };
    await this.#registerSubscriber(subscription, subscriber);
    return this.#createHandle(subscription.topic, subscriber);
  }

  async #registerSubscriber(
    subscription: RtdsSpec,
    subscriber: RtdsSubscriber,
  ): Promise<void> {
    const existing = this.#subscribersByTopic.get(subscription.topic);
    if (existing !== undefined) {
      existing.add(subscriber);
      return;
    }

    // First subscriber on this topic: open the server-side subscription.
    // RTDS keeps one subscription per topic per connection, so later
    // subscribers on the same topic reuse this one.
    const socket = await this.#ensureSocket();
    socket.send(JSON.stringify(buildSubscribeMessage(subscription)));
    this.#subscribersByTopic.set(subscription.topic, new Set([subscriber]));
  }

  #createHandle(
    topic: RtdsTopic,
    subscriber: RtdsSubscriber,
  ): SubscriptionHandle<RtdsEvent> {
    let closing: Promise<void> | undefined;
    return {
      close: () => {
        if (closing === undefined) {
          this.#subscribersByTopic.get(topic)?.delete(subscriber);
          subscriber.queue.end();
          closing = Promise.resolve();
        }
        return closing;
      },
      [Symbol.asyncIterator]() {
        return subscriber.queue[Symbol.asyncIterator]();
      },
    };
  }

  async close(): Promise<void> {
    // TODO(followup): terminate the shared socket and end all active handles.
  }

  #ensureSocket(): Promise<WebSocket> {
    if (this.#socket !== undefined) return Promise.resolve(this.#socket);
    if (this.#connecting !== undefined) return this.#connecting;

    this.#connecting = new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.#url);

      const onOpen = () => {
        socket.removeEventListener('error', onOpenError);
        this.#socket = socket;
        this.#connecting = undefined;
        this.#startHeartbeat(socket);
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
      socket.addEventListener('close', () => this.#onSocketClose());
      socket.addEventListener('error', () => this.#onSocketError());
    });

    return this.#connecting;
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
    const subscribers = this.#subscribersByTopic.get(parsed.data.topic);
    if (subscribers === undefined) return;
    for (const subscriber of subscribers) {
      if (subscriber.matches(parsed.data)) {
        subscriber.queue.push(parsed.data);
      }
    }
  }

  #onSocketClose(): void {
    // TODO(followup): reconnect + resubscribe. For now, terminate every
    // active handle's iterator so callers observe the drop.
    this.#stopHeartbeat();
    this.#socket = undefined;
    for (const subscribers of this.#subscribersByTopic.values()) {
      for (const subscriber of subscribers) {
        subscriber.queue.end();
      }
    }
    this.#subscribersByTopic.clear();
  }

  #startHeartbeat(socket: WebSocket): void {
    this.#stopHeartbeat();
    this.#heartbeat = setNonBlockingInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('PING');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  #stopHeartbeat(): void {
    if (this.#heartbeat !== undefined) {
      clearInterval(this.#heartbeat);
      this.#heartbeat = undefined;
    }
  }

  #onSocketError(): void {
    // TODO(followup): classify errors and reconnect when appropriate.
    for (const subscribers of this.#subscribersByTopic.values()) {
      for (const subscriber of subscribers) {
        subscriber.queue.end(new Error('RTDS WebSocket connection errored.'));
      }
    }
  }
}

function buildSubscribeMessage(subscription: RtdsSpec): unknown {
  switch (subscription.topic) {
    case 'comments':
      // RTDS tracks subscription state per (topic, type): different comment
      // event types coexist independently on the same socket, so one entry
      // per requested type. No server-side filters — any narrowing by
      // parentEntityID/parentEntityType happens client-side via matcherFor.
      return {
        action: 'subscribe',
        subscriptions: (subscription.types ?? ['comment_created']).map(
          (type) => ({
            topic: 'comments',
            type,
          }),
        ),
      };
    case 'prices.crypto.binance':
      // Subscribe broadly and filter client-side. Sending a second subscribe
      // frame with a different `filters` value on the same socket causes the
      // server to replace the prior subscription rather than add one, so
      // multiple subscribers on the same manager cannot share a socket while
      // using server-side filters. See docs/api-boundary-notes.md.
      return {
        action: 'subscribe',
        subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
      };
    case 'prices.crypto.chainlink':
      // RTDS tracks one filter per topic per connection, so a second subscribe
      // with a different filter replaces the first. Subscribe broadly and
      // filter client-side — see docs/api-boundary-notes.md.
      return {
        action: 'subscribe',
        subscriptions: [
          { topic: 'crypto_prices_chainlink', type: '*', filters: '' },
        ],
      };
    case 'prices.equity.pyth':
      // Same per-topic replace-on-resubscribe constraint as crypto_prices. A
      // single unfiltered subscribe covers every active equity symbol; the
      // client-side matcher narrows to the caller's requested symbol.
      return {
        action: 'subscribe',
        subscriptions: [{ topic: 'equity_prices', type: 'update' }],
      };
    default: {
      const neverSpec: never = subscription;
      invariant(false, `Unknown RTDS topic: ${String(neverSpec)}`);
    }
  }
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
