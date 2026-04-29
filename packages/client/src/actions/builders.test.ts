import { OrderSide } from '@polymarket/bindings';
import { delay, expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import {
  expectNonEmptyPage,
  findHighVolumeLowPriceMarket,
  publicClientWithBuilderKey,
  safeWalletAddress,
  testBuilderCode,
  walletClient,
} from '../testing';
import { authenticateWith, completeWith } from '../viem';

const market = await findHighVolumeLowPriceMarket();

describe('Builders', () => {
  describe('listBuilderTrades', () => {
    it('lists builder-attributed trades', async () => {
      const existingTrades = await publicClientWithBuilderKey
        .listBuilderTrades({ builder: testBuilderCode })
        .firstPage()
        .then((page) => page.items);

      if (existingTrades.length > 0) {
        expect(existingTrades[0]).toEqual(
          expect.objectContaining({
            builderCode: testBuilderCode,
            id: expect.any(String),
          }),
        );
        return;
      }

      const secureClient = await publicClientWithBuilderKey
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      console.log(market.slug);
      const [tokenId] = expectPresent(market.clobTokenIds);

      const response = await secureClient
        .prepareMarketOrder({
          amount: expectPresent(market.orderMinSize),
          builderCode: testBuilderCode,
          side: OrderSide.BUY,
          tokenId,
        })
        .then(completeWith(walletClient))
        .then(secureClient.postOrder);

      expect(response.ok).toBe(true);

      const newTrades = await waitForBuilderTrades(
        publicClientWithBuilderKey,
        tokenId,
      );

      expect(newTrades[0]).toEqual(
        expect.objectContaining({
          builderCode: testBuilderCode,
          id: expect.any(String),
        }),
      );
    });
  });
});

async function waitForBuilderTrades(
  client: typeof publicClientWithBuilderKey,
  tokenId: string,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { items } = await client
      .listBuilderTrades({ builder: testBuilderCode, tokenId })
      .firstPage();

    if (items.length > 0) {
      return items;
    }

    await delay(500);
  }

  return client
    .listBuilderTrades({ builder: testBuilderCode, tokenId })
    .firstPage()
    .then(expectNonEmptyPage)
    .then((page) => page.items);
}
