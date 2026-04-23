import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import type { CryptoPricesBinanceEvent } from './subscriptions';

async function collectEvents(
  handle: AsyncIterable<CryptoPricesBinanceEvent>,
  count: number,
): Promise<CryptoPricesBinanceEvent[]> {
  const events: CryptoPricesBinanceEvent[] = [];
  for await (const event of handle) {
    events.push(event);
    if (events.length >= count) break;
  }
  return events;
}

describe('subscribe', () => {
  it('streams Binance crypto price updates from RTDS', {
    timeout: 15_000,
  }, async () => {
    const handle = await publicClient.subscribe([
      {
        topic: 'prices.crypto.binance',
        symbols: ['btcusdt'],
      },
    ]);

    try {
      const events = await collectEvents(
        handle as AsyncIterable<CryptoPricesBinanceEvent>,
        3,
      );
      for (const event of events) {
        console.log('RTDS crypto price event', event);
        expect(event.topic).toBe('prices.crypto.binance');
        expect(event.type).toBe('update');
        expect(event.payload.symbol).toBe('btcusdt');
        expect(typeof event.payload.value).toBe('number');
      }
    } finally {
      await handle.close();
    }
  });

  it('fans out independent filters on the same shared RTDS socket', {
    timeout: 20_000,
  }, async () => {
    const btcHandle = await publicClient.subscribe([
      { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
    ]);
    const ethHandle = await publicClient.subscribe([
      { topic: 'prices.crypto.binance', symbols: ['ethusdt'] },
    ]);

    try {
      const [btcEvents, ethEvents] = await Promise.all([
        collectEvents(btcHandle as AsyncIterable<CryptoPricesBinanceEvent>, 3),
        collectEvents(ethHandle as AsyncIterable<CryptoPricesBinanceEvent>, 3),
      ]);

      expect(btcEvents.length).toBe(3);
      expect(ethEvents.length).toBe(3);
      for (const event of btcEvents) {
        expect(event.payload.symbol).toBe('btcusdt');
      }
      for (const event of ethEvents) {
        expect(event.payload.symbol).toBe('ethusdt');
      }
    } finally {
      await Promise.all([btcHandle.close(), ethHandle.close()]);
    }
  });
});
