import type {
  CryptoPricesBinanceEvent,
  CryptoPricesChainlinkEvent,
  MarketEvent,
  SportsEvent,
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
  it('narrows a single-topic spec to that topic’s event union', () => {
    type MarketOnly = EventForSubscriptionSpecs<
      readonly [{ topic: 'market'; tokenIds: readonly string[] }]
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
    expectTypeOf<Mixed>().toEqualTypeOf<MarketEvent | SportsEvent>();
  });
});

describe('PublicClient.subscribe', () => {
  it('infers the event type from object-literal subscription specs', async () => {
    const client = createPublicClient();

    // Intentionally not awaited; we only care about the static type.
    const pending = client.subscribe([{ topic: 'market', tokenIds: ['123'] }]);
    expectTypeOf(pending).resolves.toEqualTypeOf<
      SubscriptionHandle<MarketEvent>
    >();
  });

  it('excludes secure-only events from a public subscription', async () => {
    const client = createPublicClient();
    const pending = client.subscribe([{ topic: 'market', tokenIds: ['123'] }]);
    const handle = await pending;

    for await (const event of handle) {
      expectTypeOf(event).toEqualTypeOf<MarketEvent>();
      expectTypeOf<Extract<typeof event, UserEvent>>().toEqualTypeOf<never>();
    }
  });
});
