import { OrderSide } from '@polymarket/bindings';
import { delay, expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import {
  builderAuthorization,
  createSecureClientWithDepositWallet,
  expectNonEmptyPage,
  findHighVolumeLowPriceMarket,
  publicClientWithBuilderKey,
  runMeteredTests,
  testBuilderCode,
} from '../testing';

const market = await findHighVolumeLowPriceMarket();

describe('Builders', () => {
  describe('listBuilderTrades', () => {
    it.runIf(runMeteredTests)(
      'lists builder-attributed trades',
      async () => {
        const existingTrades = await publicClientWithBuilderKey
          .listBuilderTrades({ builderCode: testBuilderCode })
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

        const secureClient = await createSecureClientWithDepositWallet({
          apiKey: builderAuthorization,
        });

        console.log(market.slug);
        const tokenId = expectPresent(market.outcomes.yes.tokenId);

        const response = await secureClient.placeMarketOrder({
          amount: expectPresent(market.trading.minimumOrderSize),
          builderCode: testBuilderCode,
          side: OrderSide.BUY,
          tokenId,
        });

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
      },
      20_000,
    );
  });
});

async function waitForBuilderTrades(
  client: typeof publicClientWithBuilderKey,
  tokenId: string,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { items } = await client
      .listBuilderTrades({ builderCode: testBuilderCode, tokenId })
      .firstPage();

    if (items.length > 0) {
      return items;
    }

    await delay(500);
  }

  return client
    .listBuilderTrades({ builderCode: testBuilderCode, tokenId })
    .firstPage()
    .then(expectNonEmptyPage)
    .then((page) => page.items);
}
