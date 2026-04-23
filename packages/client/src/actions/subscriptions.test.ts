import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';

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

    const events = [];
    try {
      for await (const event of handle) {
        console.log('RTDS crypto price event', event);
        events.push(event);
        if (events.length >= 3) {
          break;
        }
      }
    } finally {
      await handle.close();
    }

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.topic).toBe('prices.crypto.binance');
      expect(event.type).toBe('update');
      expect(event.payload.symbol).toBe('btcusdt');
      expect(typeof event.payload.value).toBe('number');
    }
  });
});
