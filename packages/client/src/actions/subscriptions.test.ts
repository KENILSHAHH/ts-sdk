import { ws } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createPublicClient } from '../clients';
import { production } from '../environments';
import { publicClient } from '../testing';
import type { CryptoPricesBinanceEvent } from './subscriptions';

const rtds = ws.link(production.rtdsWs);
const server = setupServer();

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
  describe('RDTS websocket', () => {
    beforeAll(() => {
      server.listen({ onUnhandledRequest: 'bypass' });
    });

    afterEach(() => {
      server.resetHandlers();
    });

    afterAll(() => {
      server.close();
    });

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
          collectEvents(
            btcHandle as AsyncIterable<CryptoPricesBinanceEvent>,
            3,
          ),
          collectEvents(
            ethHandle as AsyncIterable<CryptoPricesBinanceEvent>,
            3,
          ),
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

    it('sends PING heartbeats to RTDS while subscribed', {
      timeout: 5_000,
    }, async () => {
      const clientFrames: string[] = [];
      const serverFrames: string[] = [];

      server.use(
        rtds.addEventListener('connection', ({ client, server }) => {
          server.connect();
          client.addEventListener('message', (event) => {
            clientFrames.push(String(event.data));
          });
          server.addEventListener('message', (event) => {
            serverFrames.push(String(event.data));
          });
        }),
      );

      try {
        vi.useFakeTimers();
        const client = createPublicClient({ environment: production });
        const handle = await client.subscribe([
          { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
        ]);
        await vi.advanceTimersByTimeAsync(5_000);
        expect([...clientFrames, ...serverFrames]).toContain('PING');
        await handle.close();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
