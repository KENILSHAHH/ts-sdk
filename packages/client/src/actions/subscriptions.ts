import type {
  CommentsEvent,
  CryptoPricesBinanceEvent,
  CryptoPricesChainlinkEvent,
  CryptoPricesEvent,
  CryptoPricesTopic,
  EquityPricesEvent,
  EquityPricesTopic,
  MarketEvent,
  SportsEvent,
  UserEvent,
} from '@polymarket/bindings/subscriptions';
import { invariant, type Prettify } from '@polymarket/types';
import merge from 'it-merge';
import type {
  BaseClient,
  BasePublicClient,
  BaseSecureClient,
} from '../clients';
import type { TransportError } from '../errors';

// Event types — re-exported from bindings for consumer convenience.
export type {
  CommentsEvent,
  CryptoPricesBinanceEvent,
  CryptoPricesChainlinkEvent,
  CryptoPricesEvent,
  EquityPricesEvent,
  MarketEvent,
  SportsEvent,
  UserEvent,
};

// Event `type` discriminants derived from bindings events.
export type MarketEventType = MarketEvent['type'];
export type UserEventType = UserEvent['type'];
export type SportsEventType = SportsEvent['type'];
export type CommentsEventType = CommentsEvent['type'];
export type CryptoPricesEventType = CryptoPricesEvent['type'];
export type EquityPricesEventType = EquityPricesEvent['type'];

// Subscription specs.
export type MarketSubscription = {
  topic: 'market';
  tokenIds: readonly string[];
  customFeatureEnabled?: boolean;
};

export type UserSubscription = {
  topic: 'user';
  markets?: readonly string[];
};

export type SportsSubscription = {
  topic: 'sports';
};

export type CommentsSubscription = {
  topic: 'comments';
  types?: readonly CommentsEventType[];
  parentEntityId?: number;
  parentEntityType?: 'Event' | 'Market';
};

export type CryptoPricesSubscription = {
  topic: CryptoPricesTopic;
  symbols?: readonly string[];
};

export type EquityPricesSubscription = {
  topic: EquityPricesTopic;
  symbol: string;
  types?: readonly EquityPricesEventType[];
};

export type PublicSubscriptionSpec =
  | MarketSubscription
  | SportsSubscription
  | CommentsSubscription
  | CryptoPricesSubscription
  | EquityPricesSubscription;

export type SecureSubscriptionSpec = PublicSubscriptionSpec | UserSubscription;

// Event unions, aligned with subscription specs.
export type PublicRealtimeEvent =
  | MarketEvent
  | SportsEvent
  | CommentsEvent
  | CryptoPricesEvent
  | EquityPricesEvent;

export type SecureRealtimeEvent = PublicRealtimeEvent | UserEvent;

// Topics derived from event unions so bindings remain the single source of
// truth for topic literals.
export type PublicRealtimeTopic = Prettify<PublicRealtimeEvent['topic']>;
export type SecureRealtimeTopic = Prettify<SecureRealtimeEvent['topic']>;

// Spec-to-event mapping keyed by the shared `topic` discriminant. Each arm
// resolves to a named event type so hover shows the alias (e.g. `MarketEvent`)
// rather than an expanded structural shape. Adding a new topic to a
// subscription spec requires adding the matching entry here; the
// `TTopic extends keyof EventByTopic` constraint turns a missing entry into a
// compile error.
//
// Relies on `subscribe` declaring `TSubscriptions` with the `const` modifier
// so that literal topics survive inference from object literals.
type EventByTopic = {
  market: MarketEvent;
  user: UserEvent;
  sports: SportsEvent;
  comments: CommentsEvent;
  'prices.crypto.binance': CryptoPricesBinanceEvent;
  'prices.crypto.chainlink': CryptoPricesChainlinkEvent;
  'prices.equity.pyth': EquityPricesEvent;
};

export type EventForSubscriptionSpec<TSpec extends SecureSubscriptionSpec> =
  TSpec extends { topic: infer TTopic extends keyof EventByTopic }
    ? EventByTopic[TTopic]
    : never;

export type EventForSubscriptionSpecs<
  TSubscriptions extends readonly SecureSubscriptionSpec[],
> = EventForSubscriptionSpec<TSubscriptions[number]>;

export type SubscriptionHandle<TEvent> = {
  /**
   * Closes the subscription. Idempotent: subsequent calls resolve without
   * effect. Best-effort — errors from the first call propagate, later calls
   * are no-ops.
   */
  close(): Promise<void>;
} & AsyncIterable<TEvent>;

export type SubscribeError = TransportError;

/**
 * Starts one or more realtime subscriptions on this client.
 *
 * @throws {@link SubscribeError}
 * Thrown when the realtime subscription cannot be established or fails.
 *
 * @example
 * ```ts
 * const handle = await client.subscribe([
 *   { topic: 'market', tokenIds: ['123'] },
 * ]);
 *
 * for await (const event of handle) {
 *   // event: MarketEvent
 * }
 * ```
 */
export async function subscribe<
  const TSubscriptions extends readonly PublicSubscriptionSpec[],
>(
  client: BasePublicClient,
  subscriptions: TSubscriptions,
): Promise<SubscriptionHandle<EventForSubscriptionSpecs<TSubscriptions>>>;
export async function subscribe<
  const TSubscriptions extends readonly SecureSubscriptionSpec[],
>(
  client: BaseSecureClient,
  subscriptions: TSubscriptions,
): Promise<SubscriptionHandle<EventForSubscriptionSpecs<TSubscriptions>>>;
export async function subscribe(
  client: BaseClient,
  subscriptions: readonly SecureSubscriptionSpec[],
): Promise<SubscriptionHandle<unknown>> {
  const handles = await Promise.all(
    subscriptions.map((spec) => subscribeOne(client, spec)),
  );
  return mergedSubscription(handles);
}

function subscribeOne(
  client: BaseClient,
  spec: SecureSubscriptionSpec,
): Promise<SubscriptionHandle<unknown>> {
  switch (spec.topic) {
    case 'market':
      return client.webSockets.clobMarket.subscribe(spec);
    case 'sports':
      return client.webSockets.sports.subscribe(spec);
    case 'comments':
    case 'prices.crypto.binance':
    case 'prices.crypto.chainlink':
    case 'prices.equity.pyth':
      return client.webSockets.rtds.subscribe(spec);
    case 'user':
      invariant(
        client.isSecureClient(),
        "A 'user' subscription requires a secure client instance.",
      );
      return client.webSockets.clobUser.subscribe(spec);
  }
}

function mergedSubscription<TEvent>(
  children: readonly SubscriptionHandle<TEvent>[],
): SubscriptionHandle<TEvent> {
  // Cache the in-flight or settled close so subsequent `close()` calls are
  // idempotent: concurrent callers share the same underlying teardown, and
  // callers after settlement observe the original result (including any
  // rejection) instead of re-invoking child teardowns.
  let closing: Promise<void> | undefined;

  async function close(): Promise<void> {
    if (closing === undefined) {
      closing = Promise.all(children.map((child) => child.close())).then(
        () => undefined,
      );
    }
    await closing;
  }

  const iterable = merge(...children);

  return {
    close,
    [Symbol.asyncIterator]() {
      return iterable[Symbol.asyncIterator]();
    },
  };
}
