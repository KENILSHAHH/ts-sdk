import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from './fixtures';
import { findHighVolumeLowPriceMarket } from './markets';

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

describe('Subscriptions', () => {
  it('routes public subscriptions and merges their events', {
    timeout: 20_000,
  }, async ({ publicClient }) => {
    const market = await findHighVolumeLowPriceMarket(publicClient);
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
      await publicClient.closeSubscriptions();
    }
  });

  it('routes secure-only subscriptions when the client supports them', {
    timeout: 20_000,
  }, async ({ secureClientWithDepositWallet }) => {
    try {
      const handle = await secureClientWithDepositWallet.subscribe([
        { topic: 'user' },
      ]);
      await handle.close();
    } finally {
      await secureClientWithDepositWallet.closeSubscriptions();
    }
  });

  it('closes routed subscription handles', {
    timeout: 20_000,
  }, async ({ publicClient }) => {
    const market = await findHighVolumeLowPriceMarket(publicClient);
    const tokenId = expectPresent(market.outcomes.yes.tokenId);

    const handle = await publicClient.subscribe([
      { tokenIds: [tokenId], topic: 'market' },
      { topic: 'sports' },
    ]);

    await handle.close();
    await publicClient.closeSubscriptions();

    await expect(waitForNextEvent(handle)).resolves.toMatchObject({
      done: true,
    });
  });
});

function waitForNextEvent<TEvent>(
  handle: AsyncIterable<TEvent>,
): Promise<IteratorResult<TEvent>> {
  return handle[Symbol.asyncIterator]().next();
}
