import type { MarketEvent } from '@polymarket/bindings/subscriptions';
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
import { production } from '../environments';
import { publicClient } from '../testing';
import type { CryptoPricesBinanceEvent } from './subscriptions';

const clobMarket = ws.link(production.clobMarketWs);
const rtds = ws.link(production.rtdsWs);
const server = setupServer();

async function collectEvents<TEvent>(
  handle: AsyncIterable<TEvent>,
  count: number,
): Promise<TEvent[]> {
  const events: TEvent[] = [];
  for await (const event of handle) {
    events.push(event);
    if (events.length >= count) break;
  }
  return events;
}

function parseJsonFrames(frames: readonly string[]): unknown[] {
  return frames.flatMap((frame) => {
    try {
      return [JSON.parse(frame) as unknown];
    } catch {
      return [];
    }
  });
}

describe('subscribe', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(async () => {
    await publicClient.webSockets.clobMarket.close();
    await publicClient.webSockets.rtds.close();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('CLOB websocket', () => {
    it('subscribes to CLOB market assets with server-side asset filters', async () => {
      const frames: string[] = [];

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const handle = await publicClient.subscribe([
        {
          customFeatureEnabled: true,
          tokenIds: ['token-a'],
          topic: 'market',
        },
      ]);

      try {
        await vi.waitFor(() => {
          expect(parseJsonFrames(frames)).toEqual([
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: true,
              type: 'market',
            },
          ]);
        });
      } finally {
        await handle.close();
      }
    });

    it('adds and removes CLOB market assets on the shared socket', async () => {
      const frames: string[] = [];

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const firstHandle = await publicClient.subscribe([
        { tokenIds: ['token-a'], topic: 'market' },
      ]);
      const secondHandle = await publicClient.subscribe([
        { tokenIds: ['token-b'], topic: 'market' },
      ]);

      try {
        await vi.waitFor(() => {
          expect(parseJsonFrames(frames)).toEqual([
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: false,
              type: 'market',
            },
            {
              assets_ids: ['token-b'],
              custom_feature_enabled: false,
              operation: 'subscribe',
            },
          ]);
        });

        frames.length = 0;
        await firstHandle.close();
        expect(parseJsonFrames(frames)).toEqual([
          { assets_ids: ['token-a'], operation: 'unsubscribe' },
        ]);
      } finally {
        await secondHandle.close();
      }
    });

    it('updates CLOB market custom feature flag on the shared socket', async () => {
      const frames: string[] = [];

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const standardHandle = await publicClient.subscribe([
        { tokenIds: ['token-a'], topic: 'market' },
      ]);
      const customHandle = await publicClient.subscribe([
        {
          customFeatureEnabled: true,
          tokenIds: ['token-a'],
          topic: 'market',
        },
      ]);

      try {
        await vi.waitFor(() => {
          expect(parseJsonFrames(frames)).toEqual([
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: false,
              type: 'market',
            },
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: true,
              operation: 'subscribe',
            },
          ]);
        });

        frames.length = 0;
        await customHandle.close();
        expect(parseJsonFrames(frames)).toEqual([
          {
            assets_ids: ['token-a'],
            custom_feature_enabled: false,
            operation: 'subscribe',
          },
        ]);
      } finally {
        await customHandle.close();
        await standardHandle.close();
      }
    });

    it('fans out CLOB market events to matching token handles', async () => {
      let clientConnection: { send: (data: string) => void } | undefined;

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          clientConnection = client;
        }),
      );

      const handle = await publicClient.subscribe([
        { tokenIds: ['token-a'], topic: 'market' },
      ]);
      const next = (handle as AsyncIterable<MarketEvent>)
        [Symbol.asyncIterator]()
        .next();

      try {
        clientConnection?.send(
          JSON.stringify({
            asks: [],
            asset_id: 'token-a',
            bids: [],
            event_type: 'book',
            market: '0xmarket',
          }),
        );

        await expect(next).resolves.toMatchObject({
          done: false,
          value: {
            payload: { asset_id: 'token-a' },
            topic: 'market',
            type: 'book',
          },
        });
      } finally {
        await handle.close();
      }
    });

    it('delivers custom CLOB market events only to custom-enabled handles', async () => {
      let clientConnection: { send: (data: string) => void } | undefined;

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          clientConnection = client;
        }),
      );

      const standardHandle = await publicClient.subscribe([
        { tokenIds: ['token-a'], topic: 'market' },
      ]);
      const customHandle = await publicClient.subscribe([
        {
          customFeatureEnabled: true,
          tokenIds: ['token-a'],
          topic: 'market',
        },
      ]);
      const standardNext = (standardHandle as AsyncIterable<MarketEvent>)
        [Symbol.asyncIterator]()
        .next();
      const customNext = (customHandle as AsyncIterable<MarketEvent>)
        [Symbol.asyncIterator]()
        .next();

      try {
        clientConnection?.send(
          JSON.stringify({
            asset_id: 'token-a',
            best_ask: '0.51',
            best_bid: '0.49',
            event_type: 'best_bid_ask',
            market: '0xmarket',
          }),
        );

        await expect(customNext).resolves.toMatchObject({
          done: false,
          value: {
            payload: { asset_id: 'token-a' },
            topic: 'market',
            type: 'best_bid_ask',
          },
        });

        await standardHandle.close();
        await expect(standardNext).resolves.toMatchObject({ done: true });
      } finally {
        await standardHandle.close();
        await customHandle.close();
      }
    });

    it('sends CLOB PING heartbeats and treats PONG as freshness', {
      timeout: 5_000,
    }, async () => {
      const frames: string[] = [];

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
            if (event.data === 'PING') client.send('PONG');
          });
        }),
      );

      try {
        vi.useFakeTimers();
        const handle = await publicClient.subscribe([
          { tokenIds: ['token-a'], topic: 'market' },
        ]);

        await vi.advanceTimersByTimeAsync(10_000);

        expect(frames).toContain('PING');
        await handle.close();
      } finally {
        await publicClient.webSockets.clobMarket.close();
        vi.useRealTimers();
      }
    });

    it('reconnects and resubscribes active CLOB market assets after an unexpected close', {
      timeout: 5_000,
    }, async () => {
      const connectionFrames: string[][] = [];
      let firstClient: { close: () => void } | undefined;

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          const frames: string[] = [];
          connectionFrames.push(frames);
          if (connectionFrames.length === 1) firstClient = client;
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const random = vi.spyOn(Math, 'random').mockReturnValue(1);
      vi.useFakeTimers();

      try {
        const handle = await publicClient.subscribe([
          { tokenIds: ['token-a'], topic: 'market' },
        ]);

        await vi.waitFor(() => {
          expect(parseJsonFrames(connectionFrames[0] ?? [])).toEqual([
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: false,
              type: 'market',
            },
          ]);
        });

        firstClient?.close();
        await vi.advanceTimersByTimeAsync(250);

        await vi.waitFor(() => {
          expect(parseJsonFrames(connectionFrames[1] ?? [])).toEqual([
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: false,
              type: 'market',
            },
          ]);
        });

        await handle.close();
      } finally {
        random.mockRestore();
        await publicClient.webSockets.clobMarket.close();
        vi.useRealTimers();
      }
    });
  });

  describe('RTDS websocket', () => {
    it('streams events for a public subscription', {
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
      const frames: string[] = [];

      server.use(
        rtds.addEventListener('connection', ({ client, server }) => {
          server.connect();
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      try {
        vi.useFakeTimers();
        const handle = await publicClient.subscribe([
          { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
        ]);

        await vi.advanceTimersByTimeAsync(5_000);

        expect(frames).toContain('PING');
        await handle.close();
      } finally {
        await publicClient.webSockets.rtds.close();
        vi.useRealTimers();
      }
    });

    it('ends active iterators when the manager closes', {
      timeout: 5_000,
    }, async () => {
      const handle = await publicClient.subscribe([
        { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
      ]);
      const iterator = handle[Symbol.asyncIterator]();
      const next = iterator.next();

      await publicClient.webSockets.rtds.close();

      await expect(next).resolves.toMatchObject({ done: true });
    });

    it('unsubscribes from a server entry only after the last handle closes', async () => {
      const frames: string[] = [];

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const btcHandle = await publicClient.subscribe([
        { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
      ]);
      const ethHandle = await publicClient.subscribe([
        { topic: 'prices.crypto.binance', symbols: ['ethusdt'] },
      ]);

      try {
        frames.length = 0;
        await btcHandle.close();
        expect(parseJsonFrames(frames)).toEqual([]);

        await ethHandle.close();
        expect(parseJsonFrames(frames)).toEqual([
          {
            action: 'unsubscribe',
            subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
          },
        ]);
      } finally {
        await publicClient.webSockets.rtds.close();
      }
    });

    it('unsubscribes only the unshared server entry for an overlapping comments handle', async () => {
      const frames: string[] = [];

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const mixedHandle = await publicClient.subscribe([
        {
          topic: 'comments',
          types: ['comment_created', 'reaction_created'],
        },
      ]);
      const reactionHandle = await publicClient.subscribe([
        { topic: 'comments', types: ['reaction_created'] },
      ]);

      try {
        frames.length = 0;
        await mixedHandle.close();
        expect(parseJsonFrames(frames)).toEqual([
          {
            action: 'unsubscribe',
            subscriptions: [{ topic: 'comments', type: 'comment_created' }],
          },
        ]);
      } finally {
        await reactionHandle.close();
        await publicClient.webSockets.rtds.close();
      }
    });

    it('reconnects and resubscribes active RTDS server entries after an unexpected close', {
      timeout: 5_000,
    }, async () => {
      const connectionFrames: string[][] = [];
      let firstClient: { close: () => void } | undefined;
      let secondClient: { send: (data: string) => void } | undefined;

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          const frames: string[] = [];
          connectionFrames.push(frames);
          if (connectionFrames.length === 1) firstClient = client;
          if (connectionFrames.length === 2) secondClient = client;
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const random = vi.spyOn(Math, 'random').mockReturnValue(1);
      vi.useFakeTimers();

      try {
        const handle = await publicClient.subscribe([
          { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
        ]);
        const next = handle[Symbol.asyncIterator]().next();

        await vi.waitFor(() => {
          expect(parseJsonFrames(connectionFrames[0] ?? [])).toEqual([
            {
              action: 'subscribe',
              subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
            },
          ]);
        });

        firstClient?.close();
        await vi.advanceTimersByTimeAsync(250);

        await vi.waitFor(() => {
          expect(parseJsonFrames(connectionFrames[1] ?? [])).toEqual([
            {
              action: 'subscribe',
              subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
            },
          ]);
        });

        secondClient?.send(
          JSON.stringify({
            topic: 'crypto_prices',
            type: 'update',
            timestamp: 1,
            payload: { symbol: 'btcusdt', timestamp: 1, value: 100 },
          }),
        );

        await expect(next).resolves.toMatchObject({
          done: false,
          value: {
            topic: 'prices.crypto.binance',
            type: 'update',
            payload: { symbol: 'btcusdt', value: 100 },
          },
        });

        await handle.close();
      } finally {
        random.mockRestore();
        await publicClient.webSockets.rtds.close();
        vi.useRealTimers();
      }
    });

    it('forces reconnect and resubscribes when RTDS data goes stale', {
      timeout: 5_000,
    }, async () => {
      const connectionFrames: string[][] = [];
      let secondClient: { send: (data: string) => void } | undefined;

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          const frames: string[] = [];
          connectionFrames.push(frames);
          if (connectionFrames.length === 2) secondClient = client;
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
        }),
      );

      const random = vi.spyOn(Math, 'random').mockReturnValue(1);
      vi.useFakeTimers();

      try {
        const handle = await publicClient.subscribe([
          { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
        ]);
        const next = handle[Symbol.asyncIterator]().next();

        await vi.waitFor(() => {
          expect(parseJsonFrames(connectionFrames[0] ?? [])).toEqual([
            {
              action: 'subscribe',
              subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
            },
          ]);
        });

        await vi.advanceTimersByTimeAsync(30_250);

        await vi.waitFor(() => {
          expect(parseJsonFrames(connectionFrames[1] ?? [])).toEqual([
            {
              action: 'subscribe',
              subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
            },
          ]);
        });

        secondClient?.send(
          JSON.stringify({
            topic: 'crypto_prices',
            type: 'update',
            timestamp: 1,
            payload: { symbol: 'btcusdt', timestamp: 1, value: 100 },
          }),
        );

        await expect(next).resolves.toMatchObject({
          done: false,
          value: {
            topic: 'prices.crypto.binance',
            type: 'update',
            payload: { symbol: 'btcusdt', value: 100 },
          },
        });

        await handle.close();
      } finally {
        random.mockRestore();
        await publicClient.webSockets.rtds.close();
        vi.useRealTimers();
      }
    });
  });
});
