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
import type { Prettify } from '@polymarket/types';
import type { BaseClient } from '../clients';
import { TransportError } from '../errors';

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
  close(): Promise<void>;
  readonly closed: Promise<void>;
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
  const TSubscriptions extends readonly SecureSubscriptionSpec[],
>(
  _client: BaseClient,
  _subscriptions: TSubscriptions,
): Promise<SubscriptionHandle<EventForSubscriptionSpecs<TSubscriptions>>> {
  throw new TransportError('Realtime subscriptions are not implemented yet.');
}
