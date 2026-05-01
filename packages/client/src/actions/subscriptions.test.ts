import { expectPresent } from '@polymarket/types';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createSecureClientWithSafeWallet,
  findHighVolumeLowPriceMarket,
  publicClient,
} from '../testing';
import { waitForNextEvent } from '../websockets/testing';

type EventWithOptionalSymbol = {
  topic: string;
  payload?: {
    symbol?: string;
  };
};

async function collectCryptoSymbols(
  handle: AsyncIterable<EventWithOptionalSymbol>,
  expectedSymbols: readonly string[],
): Promise<Set<string>> {
  const expected = new Set(expectedSymbols);
  const seen = new Set<string>();

  for await (const event of handle) {
    if (event.topic !== 'prices.crypto.binance') continue;
    const symbol = event.payload?.symbol;
    if (symbol !== undefined && expected.has(symbol)) {
      seen.add(symbol);
    }
    if (seen.size === expected.size) break;
  }

  return seen;
}

describe('subscribe', () => {
  afterEach(async () => {
    await publicClient.closeSubscriptions();
  });

  it('routes public subscriptions and merges their events', {
    timeout: 20_000,
  }, async () => {
    const market = await findHighVolumeLowPriceMarket();
    const tokenId = expectPresent(market.outcomes.yes.tokenId);

    const handle = await publicClient.subscribe([
      { tokenIds: [tokenId], topic: 'market' },
      { topic: 'sports' },
      { symbols: ['btcusdt'], topic: 'prices.crypto.binance' },
      { symbols: ['ethusdt'], topic: 'prices.crypto.binance' },
    ]);

    try {
      const symbols = await collectCryptoSymbols(
        handle as AsyncIterable<EventWithOptionalSymbol>,
        ['btcusdt', 'ethusdt'],
      );

      expect(symbols).toEqual(new Set(['btcusdt', 'ethusdt']));
    } finally {
      await handle.close();
    }
  });

  it('routes secure-only subscriptions when the client supports them', {
    timeout: 20_000,
  }, async () => {
    const secureClient = await createSecureClientWithSafeWallet();

    try {
      const handle = await secureClient.subscribe([{ topic: 'user' }]);
      await handle.close();
    } finally {
      await secureClient.closeSubscriptions();
    }
  });

  it('closes routed subscription handles', {
    timeout: 20_000,
  }, async () => {
    const market = await findHighVolumeLowPriceMarket();
    const tokenId = expectPresent(market.outcomes.yes.tokenId);

    const handle = await publicClient.subscribe([
      { tokenIds: [tokenId], topic: 'market' },
      { topic: 'sports' },
    ]);
    const next = waitForNextEvent(handle);

    await handle.close();

    await expect(next).resolves.toMatchObject({ done: true });
  });
});
