import {
  type CommentsEvent,
  type CryptoPricesEvent,
  type EquityPricesEvent,
  type MarketEvent,
  RealtimeEventSchema,
  type SportsEvent,
  type UserEvent,
} from '@polymarket/bindings/subscriptions';
import { invariant } from '@polymarket/types';
import { pushable } from 'it-pushable';
import type {
  CommentsSubscription,
  CryptoPricesSubscription,
  EquityPricesSubscription,
  MarketSubscription,
  SportsSubscription,
  SubscriptionHandle,
  UserSubscription,
} from './actions/subscriptions';

/**
 * A WebSocket manager owns a single upstream socket surface and exposes a
 * typed `subscribe` that only accepts specs it can serve and only yields the
 * events it produces.
 *
 * `TSpec` is the union of subscription specs this manager accepts. The caller
 * issues one `subscribe` call per spec; callers that need to subscribe to
 * several specs at once can compose per-spec handles through a higher-level
 * merge helper.
 *
 * `TEvent` is the union of events it emits for any spec it accepts.
 *
 * `close()` is best-effort and idempotent.
 */
export interface WebSocketManager<TSpec, TEvent> {
  subscribe(subscription: TSpec): Promise<SubscriptionHandle<TEvent>>;

  close(): Promise<void>;
}

/**
 * Shared CLOB WebSocket manager.
 *
 * Implements {@link WebSocketManager} for both the public market stream
 * (`TSpec = MarketSubscription`, `TEvent = MarketEvent`) and the authenticated
 * user stream (`TSpec = UserSubscription`, `TEvent = UserEvent`).
 */
export class ClobWebSocketManager<TSpec, TEvent>
  implements WebSocketManager<TSpec, TEvent>
{
  async subscribe(_subscription: TSpec): Promise<SubscriptionHandle<TEvent>> {
    // TODO: implement subscription routing, reconnect, and event decoding.
    throw new Error('ClobWebSocketManager.subscribe is not implemented yet.');
  }

  async close(): Promise<void> {
    // TODO: close the upstream socket. Idempotent by contract.
  }
}

/**
 * Sports WebSocket manager.
 *
 * Implements {@link WebSocketManager} with `TSpec = SportsSubscription` and
 * `TEvent = SportsEvent`.
 */
export class SportsWebSocketManager
  implements WebSocketManager<SportsSubscription, SportsEvent>
{
  async subscribe(
    _subscription: SportsSubscription,
  ): Promise<SubscriptionHandle<SportsEvent>> {
    // TODO: implement subscription routing, reconnect, and event decoding.
    throw new Error('SportsWebSocketManager.subscribe is not implemented yet.');
  }

  async close(): Promise<void> {
    // TODO: close the upstream socket. Idempotent by contract.
  }
}

/**
 * Realtime Data Service (RTDS) WebSocket manager.
 *
 * Implements {@link WebSocketManager} for the comments, crypto prices, and
 * equity prices topics multiplexed over the RTDS socket.
 */
type RtdsSpec =
  | CommentsSubscription
  | CryptoPricesSubscription
  | EquityPricesSubscription;

type RtdsEvent = CommentsEvent | CryptoPricesEvent | EquityPricesEvent;

export class RtdsWebSocketManager
  implements WebSocketManager<RtdsSpec, RtdsEvent>
{
  readonly #url: string;

  constructor(url: string) {
    this.#url = url;
  }

  async subscribe(
    subscription: RtdsSpec,
  ): Promise<SubscriptionHandle<RtdsEvent>> {
    // TODO: coalesce multiple subscribers into one shared upstream socket and
    // send a combined subscribe frame. For now each `subscribe` call opens its
    // own socket and owns it for the lifetime of the handle.
    const socket = new WebSocket(this.#url);
    await waitForOpen(socket);
    socket.send(JSON.stringify(buildSubscribeMessage(subscription)));

    const events = pushable<RtdsEvent>({ objectMode: true });
    const matchesSubscription = matcherFor(subscription);

    socket.addEventListener('message', (event) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const parsed = RealtimeEventSchema.safeParse(raw);
      if (!parsed.success) return;
      if (matchesSubscription(parsed.data)) {
        events.push(parsed.data);
      }
    });

    socket.addEventListener('close', () => {
      events.end();
    });

    socket.addEventListener('error', () => {
      events.end(new Error('RTDS WebSocket connection errored.'));
    });

    let closing: Promise<void> | undefined;
    async function close(): Promise<void> {
      if (closing === undefined) {
        closing = new Promise<void>((resolve) => {
          if (
            socket.readyState === WebSocket.CLOSED ||
            socket.readyState === WebSocket.CLOSING
          ) {
            resolve();
            return;
          }
          socket.addEventListener('close', () => resolve(), { once: true });
          socket.close();
        }).then(() => {
          events.end();
        });
      }
      await closing;
    }

    return {
      close,
      [Symbol.asyncIterator]() {
        return events[Symbol.asyncIterator]();
      },
    };
  }

  async close(): Promise<void> {
    // TODO: close shared upstream socket when one is introduced. Currently a
    // no-op because each subscription owns its own socket.
  }
}

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('RTDS WebSocket failed to open.'));
    };
    function cleanup() {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
    }
    socket.addEventListener('open', onOpen, { once: true });
    socket.addEventListener('error', onError, { once: true });
  });
}

function buildSubscribeMessage(subscription: RtdsSpec): unknown {
  switch (subscription.topic) {
    case 'comments':
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
      // The RTDS `filters` field expects a JSON-encoded object filter, not a
      // comma-separated list — one subscription per symbol.
      return {
        action: 'subscribe',
        subscriptions:
          subscription.symbols && subscription.symbols.length > 0
            ? subscription.symbols.map((symbol) => ({
                topic: 'crypto_prices',
                type: 'update',
                filters: JSON.stringify({ symbol }),
              }))
            : [{ topic: 'crypto_prices', type: 'update' }],
      };
    case 'prices.crypto.chainlink':
      return {
        action: 'subscribe',
        subscriptions: [
          {
            topic: 'crypto_prices_chainlink',
            type: '*',
            ...(subscription.symbols && subscription.symbols.length > 0
              ? { filters: `{"symbol":"${subscription.symbols[0]}"}` }
              : { filters: '' }),
          },
        ],
      };
    case 'prices.equity.pyth':
      return {
        action: 'subscribe',
        subscriptions: (subscription.types ?? ['update']).map((type) => ({
          topic: 'equity_prices',
          type,
          filters: `{"symbol":"${subscription.symbol}"}`,
        })),
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
      return (event) => event.topic === 'comments';
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
      return (event) =>
        event.topic === 'prices.equity.pyth' &&
        event.payload.symbol.toLowerCase() ===
          subscription.symbol.toLowerCase();
    default: {
      const neverSpec: never = subscription;
      invariant(false, `Unknown RTDS topic: ${String(neverSpec)}`);
    }
  }
}

// Surfaces available on the public client.
export type PublicWebSocketManagers = {
  readonly clobMarket: WebSocketManager<MarketSubscription, MarketEvent>;
  readonly sports: WebSocketManager<SportsSubscription, SportsEvent>;
  readonly rtds: WebSocketManager<RtdsSpec, RtdsEvent>;
};

// Secure client additionally exposes the user surface.
export type SecureWebSocketManagers = PublicWebSocketManagers & {
  readonly clobUser: WebSocketManager<UserSubscription, UserEvent>;
};
