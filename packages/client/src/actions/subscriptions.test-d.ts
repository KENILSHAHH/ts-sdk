import type {
  CryptoPricesBinanceEvent,
  CryptoPricesChainlinkEvent,
  CustomMarketEvent,
  MarketEvent,
  SportsEvent,
  StandardMarketEvent,
  UserEvent,
} from '@polymarket/bindings/subscriptions';
import { describe, expectTypeOf, it } from 'vitest';
import { createPublicClient } from '../index';
import type {
  EquityPricesEvent,
  EventForSubscriptionSpecs,
  SubscriptionHandle,
} from './subscriptions';

describe('EventForSubscriptionSpecs', () => {
  it('narrows a standard market spec to standard market events', () => {
    type MarketOnly = EventForSubscriptionSpecs<
      readonly [{ topic: 'market'; tokenIds: readonly string[] }]
    >;
    expectTypeOf<MarketOnly>().toEqualTypeOf<StandardMarketEvent>();
    expectTypeOf<
      Extract<MarketOnly, CustomMarketEvent>
    >().toEqualTypeOf<never>();
  });

  it('narrows a custom-enabled market spec to all market events', () => {
    type MarketOnly = EventForSubscriptionSpecs<
      readonly [
        {
          customFeatureEnabled: true;
          topic: 'market';
          tokenIds: readonly string[];
        },
      ]
    >;
    expectTypeOf<MarketOnly>().toEqualTypeOf<MarketEvent>();
  });

  it('narrows a custom-disabled market spec to standard market events', () => {
    type MarketOnly = EventForSubscriptionSpecs<
      readonly [
        {
          customFeatureEnabled: false;
          topic: 'market';
          tokenIds: readonly string[];
        },
      ]
    >;
    expectTypeOf<MarketOnly>().toEqualTypeOf<StandardMarketEvent>();
  });

  it('keeps all market events when customFeatureEnabled is dynamic', () => {
    type MarketOnly = EventForSubscriptionSpecs<
      readonly [
        {
          customFeatureEnabled: boolean;
          topic: 'market';
          tokenIds: readonly string[];
        },
      ]
    >;
    expectTypeOf<MarketOnly>().toEqualTypeOf<MarketEvent>();
  });

  it('narrows `prices.crypto.binance` to the Binance event type', () => {
    type BinanceOnly = EventForSubscriptionSpecs<
      readonly [{ topic: 'prices.crypto.binance' }]
    >;
    expectTypeOf<BinanceOnly>().toEqualTypeOf<CryptoPricesBinanceEvent>();
  });

  it('narrows `prices.crypto.chainlink` to the Chainlink event type', () => {
    type ChainlinkOnly = EventForSubscriptionSpecs<
      readonly [{ topic: 'prices.crypto.chainlink' }]
    >;
    expectTypeOf<ChainlinkOnly>().toEqualTypeOf<CryptoPricesChainlinkEvent>();
  });

  it('maps equity prices to the equity event union', () => {
    type EquityOnly = EventForSubscriptionSpecs<
      readonly [{ topic: 'prices.equity.pyth'; symbol: string }]
    >;
    expectTypeOf<EquityOnly>().toEqualTypeOf<EquityPricesEvent>();
  });

  it('unions the event types of a multi-topic spec', () => {
    type Mixed = EventForSubscriptionSpecs<
      readonly [
        { topic: 'market'; tokenIds: readonly string[] },
        { topic: 'sports' },
      ]
    >;
    expectTypeOf<Mixed>().toEqualTypeOf<StandardMarketEvent | SportsEvent>();
  });
});

describe('PublicClient.subscribe', () => {
  it('infers the event type from object-literal subscription specs', async () => {
    const client = createPublicClient();

    // Intentionally not awaited; we only care about the static type.
    const pending = client.subscribe([{ topic: 'market', tokenIds: ['123'] }]);
    expectTypeOf(pending).resolves.toEqualTypeOf<
      SubscriptionHandle<StandardMarketEvent>
    >();
  });

  it('infers custom-enabled market events from object-literal subscription specs', async () => {
    const client = createPublicClient();

    // Intentionally not awaited; we only care about the static type.
    const pending = client.subscribe([
      { customFeatureEnabled: true, topic: 'market', tokenIds: ['123'] },
    ]);
    expectTypeOf(pending).resolves.toEqualTypeOf<
      SubscriptionHandle<MarketEvent>
    >();
  });

  it('excludes secure-only events from a public subscription', async () => {
    const client = createPublicClient();
    const pending = client.subscribe([{ topic: 'market', tokenIds: ['123'] }]);
    const handle = await pending;

    for await (const event of handle) {
      expectTypeOf(event).toEqualTypeOf<StandardMarketEvent>();
      expectTypeOf<Extract<typeof event, UserEvent>>().toEqualTypeOf<never>();
    }
  });
});
