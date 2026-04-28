import type {
  MarketEvent,
  SportsEvent,
  UserEvent,
} from '@polymarket/bindings/subscriptions';
import { expectPresent } from '@polymarket/types';
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
import {
  findHighVolumeLowPriceMarket,
  publicClient,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { authenticateWith } from '../viem';
import type { CryptoPricesBinanceEvent } from './subscriptions';

const clobMarket = ws.link(production.clobMarketWs);
const clobUser = ws.link(production.clobUserWs);
const rtds = ws.link(production.rtdsWs);
const sports = ws.link(production.sportsWs);
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

describe('subscribe', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(async () => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('CLOB websocket', () => {
    afterEach(async () => {
      await publicClient.closeSubscriptions();
    });

    it('subscribes to CLOB market assets with server-side asset filters', {
      timeout: 20_000,
    }, async () => {
      const market = await findHighVolumeLowPriceMarket();
      const [tokenId] = expectPresent(market.clobTokenIds);
      await publicClient.subscribe([{ tokenIds: [tokenId], topic: 'market' }]);
    });

    it('adds and removes CLOB market assets on the shared socket', async () => {
      let frames: unknown[] = [];

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
          });
        }),
      );

      const firstHandle = await publicClient.subscribe([
        { tokenIds: ['token-a'], topic: 'market' },
      ]);
      await publicClient.subscribe([
        { tokenIds: ['token-b'], topic: 'market' },
      ]);

      await vi.waitFor(() => {
        expect(frames).toEqual([
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

      frames = [];
      await firstHandle.close();
      expect(frames).toEqual([
        { assets_ids: ['token-a'], operation: 'unsubscribe' },
      ]);
    });

    it('updates CLOB market custom feature flag on the shared socket', async () => {
      let frames: unknown[] = [];

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
          });
        }),
      );

      await publicClient.subscribe([
        { tokenIds: ['token-a'], topic: 'market' },
      ]);
      const customHandle = await publicClient.subscribe([
        {
          customFeatureEnabled: true,
          tokenIds: ['token-a'],
          topic: 'market',
        },
      ]);

      await vi.waitFor(() => {
        expect(frames).toEqual([
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

      frames = [];
      await customHandle.close();
      expect(frames).toEqual([
        {
          assets_ids: ['token-a'],
          custom_feature_enabled: false,
          operation: 'subscribe',
        },
      ]);
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

      await vi.waitFor(() => {
        expect(clientConnection).toBeDefined();
      });

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
          payload: { tokenId: 'token-a' },
          topic: 'market',
          type: 'book',
        },
      });
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

      await vi.waitFor(() => {
        expect(clientConnection).toBeDefined();
      });

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
          payload: { tokenId: 'token-a' },
          topic: 'market',
          type: 'best_bid_ask',
        },
      });

      await standardHandle.close();
      await expect(standardNext).resolves.toMatchObject({ done: true });
    });

    it('sends CLOB PING heartbeats while subscribed', {
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
        await publicClient.subscribe([
          { tokenIds: ['token-a'], topic: 'market' },
        ]);

        await vi.advanceTimersByTimeAsync(10_000);

        expect(frames).toContain('PING');
      } finally {
        vi.useRealTimers();
      }
    });

    it('reconnects and resubscribes active CLOB market assets after an unexpected close', {
      timeout: 5_000,
    }, async () => {
      const connectionFrames: unknown[][] = [];
      let firstClient: { close: () => void } | undefined;

      server.use(
        clobMarket.addEventListener('connection', ({ client }) => {
          const frames: unknown[] = [];
          connectionFrames.push(frames);
          if (connectionFrames.length === 1) firstClient = client;
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
          });
        }),
      );

      const random = vi.spyOn(Math, 'random').mockReturnValue(1);
      vi.useFakeTimers();

      try {
        await publicClient.subscribe([
          { tokenIds: ['token-a'], topic: 'market' },
        ]);

        await vi.waitFor(() => {
          expect(connectionFrames[0] ?? []).toEqual([
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
          expect(connectionFrames[1] ?? []).toEqual([
            {
              assets_ids: ['token-a'],
              custom_feature_enabled: false,
              type: 'market',
            },
          ]);
        });
      } finally {
        random.mockRestore();
        vi.useRealTimers();
      }
    });

    it('subscribes to the live CLOB user stream with secure credentials', {
      timeout: 20_000,
    }, async () => {
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      try {
        await secureClient.subscribe([{ topic: 'user' }]);
      } finally {
        await secureClient.closeSubscriptions();
      }
    });

    it('keeps the CLOB user socket broad while any handle subscribes to all markets', async () => {
      let frames: unknown[] = [];

      server.use(
        clobUser.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
          });
        }),
      );

      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      await secureClient.subscribe([{ markets: ['market-a'], topic: 'user' }]);
      const broadHandle = await secureClient.subscribe([{ topic: 'user' }]);

      try {
        await vi.waitFor(() => {
          expect(frames).toEqual([
            expect.objectContaining({
              auth: {
                apiKey: expect.any(String),
                passphrase: expect.any(String),
                secret: expect.any(String),
              },
              markets: ['market-a'],
              type: 'user',
            }),
            { markets: ['market-a'], operation: 'unsubscribe' },
          ]);
        });

        frames = [];
        await broadHandle.close();
        expect(frames).toEqual([
          { markets: ['market-a'], operation: 'subscribe' },
        ]);
      } finally {
        await secureClient.closeSubscriptions();
      }
    });

    it('fans out CLOB user events to matching market handles', async () => {
      let clientConnection: { send: (data: string) => void } | undefined;

      server.use(
        clobUser.addEventListener('connection', ({ client }) => {
          clientConnection = client;
        }),
      );

      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const marketAHandle = await secureClient.subscribe([
        { markets: ['market-a'], topic: 'user' },
      ]);
      const marketBHandle = await secureClient.subscribe([
        { markets: ['market-b'], topic: 'user' },
      ]);
      const marketANext = (marketAHandle as AsyncIterable<UserEvent>)
        [Symbol.asyncIterator]()
        .next();
      const marketBNext = (marketBHandle as AsyncIterable<UserEvent>)
        [Symbol.asyncIterator]()
        .next();

      try {
        clientConnection?.send(
          JSON.stringify({
            asset_id: 'token-a',
            created_at: '1641042000',
            event_type: 'order',
            expiration: '1641045600',
            id: 'order-a',
            market: 'market-a',
            original_size: '1',
            owner: 'test-owner',
            price: '0.5',
            side: 'BUY',
            size_matched: '0',
            timestamp: '1',
            type: 'PLACEMENT',
          }),
        );

        await expect(marketANext).resolves.toMatchObject({
          done: false,
          value: {
            payload: {
              createdAt: '2022-01-01T13:00:00.000Z',
              expiresAt: '2022-01-01T14:00:00.000Z',
              market: 'market-a',
              orderEventType: 'PLACEMENT',
              timestamp: 1,
            },
            topic: 'user',
            type: 'order',
          },
        });

        await marketBHandle.close();
        await expect(marketBNext).resolves.toMatchObject({ done: true });
      } finally {
        await secureClient.closeSubscriptions();
      }
    });
  });

  describe('Sports websocket', () => {
    afterEach(async () => {
      await publicClient.closeSubscriptions();
    });

    it('subscribes to the live sports stream', {
      timeout: 20_000,
    }, async () => {
      await publicClient.subscribe([{ topic: 'sports' }]);
    });

    it('responds to sports ping heartbeats', async () => {
      const frames: string[] = [];

      server.use(
        sports.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(String(event.data));
          });
          client.send('ping');
        }),
      );

      await publicClient.subscribe([{ topic: 'sports' }]);

      await vi.waitFor(() => {
        expect(frames).toContain('pong');
      });
    });

    it('fans out sports events to active handles', async () => {
      let clientConnection: { send: (data: string) => void } | undefined;

      server.use(
        sports.addEventListener('connection', ({ client }) => {
          clientConnection = client;
        }),
      );

      const firstHandle = await publicClient.subscribe([{ topic: 'sports' }]);
      const secondHandle = await publicClient.subscribe([{ topic: 'sports' }]);
      const firstNext = (firstHandle as AsyncIterable<SportsEvent>)
        [Symbol.asyncIterator]()
        .next();
      const secondNext = (secondHandle as AsyncIterable<SportsEvent>)
        [Symbol.asyncIterator]()
        .next();

      await vi.waitFor(() => {
        expect(clientConnection).toBeDefined();
      });

      clientConnection?.send(
        JSON.stringify({
          ended: false,
          gameId: 123,
          leagueAbbreviation: 'NBA',
          finishedTimestamp: '2024-01-09T17:47:52.121Z',
          live: true,
          score: '0-0',
          status: 'inprogress',
        }),
      );

      await expect(firstNext).resolves.toMatchObject({
        done: false,
        value: {
          payload: {
            finishedAt: '2024-01-09T17:47:52.121Z',
            gameId: 123,
            leagueAbbreviation: 'NBA',
          },
          topic: 'sports',
          type: 'sport_result',
        },
      });
      await expect(secondNext).resolves.toMatchObject({
        done: false,
        value: {
          payload: {
            finishedAt: '2024-01-09T17:47:52.121Z',
            gameId: 123,
            leagueAbbreviation: 'NBA',
          },
          topic: 'sports',
          type: 'sport_result',
        },
      });
    });
  });

  describe('RTDS websocket', () => {
    afterEach(async () => {
      await publicClient.closeSubscriptions();
    });

    it('streams events for a public subscription', {
      timeout: 15_000,
    }, async () => {
      const handle = await publicClient.subscribe([
        {
          topic: 'prices.crypto.binance',
          symbols: ['btcusdt'],
        },
      ]);

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
        await publicClient.subscribe([
          { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
        ]);

        await vi.advanceTimersByTimeAsync(5_000);

        expect(frames).toContain('PING');
      } finally {
        vi.useRealTimers();
      }
    });

    it('ends active iterators when the client closes subscriptions', {
      timeout: 5_000,
    }, async () => {
      const handle = await publicClient.subscribe([
        { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
      ]);
      const iterator = handle[Symbol.asyncIterator]();
      const next = iterator.next();

      await publicClient.closeSubscriptions();

      await expect(next).resolves.toMatchObject({ done: true });
    });

    it('unsubscribes from a server entry only after the last handle closes', async () => {
      let frames: unknown[] = [];

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
          });
        }),
      );

      const btcHandle = await publicClient.subscribe([
        { topic: 'prices.crypto.binance', symbols: ['btcusdt'] },
      ]);
      const ethHandle = await publicClient.subscribe([
        { topic: 'prices.crypto.binance', symbols: ['ethusdt'] },
      ]);

      await vi.waitFor(() => {
        expect(frames).toEqual([
          {
            action: 'subscribe',
            subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
          },
        ]);
      });

      frames = [];
      await btcHandle.close();
      expect(frames).toEqual([]);

      frames = [];
      await ethHandle.close();
      expect(frames).toEqual([
        {
          action: 'unsubscribe',
          subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
        },
      ]);
    });

    it('unsubscribes only the unshared server entry for an overlapping comments handle', async () => {
      let frames: unknown[] = [];

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
          });
        }),
      );

      const mixedHandle = await publicClient.subscribe([
        {
          topic: 'comments',
          types: ['comment_created', 'reaction_created'],
        },
      ]);
      await publicClient.subscribe([
        { topic: 'comments', types: ['reaction_created'] },
      ]);

      await vi.waitFor(() => {
        expect(frames).toEqual([
          {
            action: 'subscribe',
            subscriptions: [
              { topic: 'comments', type: 'comment_created' },
              { topic: 'comments', type: 'reaction_created' },
            ],
          },
        ]);
      });

      frames = [];
      await mixedHandle.close();
      expect(frames).toEqual([
        {
          action: 'unsubscribe',
          subscriptions: [{ topic: 'comments', type: 'comment_created' }],
        },
      ]);
    });

    it('reconnects and resubscribes active RTDS server entries after an unexpected close', {
      timeout: 5_000,
    }, async () => {
      const connectionFrames: unknown[][] = [];
      let firstClient: { close: () => void } | undefined;
      let secondClient: { send: (data: string) => void } | undefined;

      server.use(
        rtds.addEventListener('connection', ({ client }) => {
          const frames: unknown[] = [];
          connectionFrames.push(frames);
          if (connectionFrames.length === 1) firstClient = client;
          if (connectionFrames.length === 2) secondClient = client;
          client.addEventListener('message', (event) => {
            frames.push(JSON.parse(String(event.data)));
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
          expect(connectionFrames[0] ?? []).toEqual([
            {
              action: 'subscribe',
              subscriptions: [{ topic: 'crypto_prices', type: 'update' }],
            },
          ]);
        });

        firstClient?.close();
        await vi.advanceTimersByTimeAsync(250);

        await vi.waitFor(() => {
          expect(connectionFrames[1] ?? []).toEqual([
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
            payload: { symbol: 'btcusdt', timestamp: 1, value: 100 },
          },
        });
      } finally {
        random.mockRestore();
        vi.useRealTimers();
      }
    });
  });
});
