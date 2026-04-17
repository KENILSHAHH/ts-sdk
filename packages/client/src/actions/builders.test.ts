import { OrderSide } from '@polymarket/bindings/clob';
import { delay, expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import type { PublicClient } from '../clients';
import {
  builderCredentials,
  expectNonEmptyPage,
  findHighVolumeLowPriceMarket,
  publicClientWithBuilderKey,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { authenticateWith, completeWith } from '../viem';
import { listBuilderTrades } from './builders';
import { postOrder, prepareMarketOrder } from './orders';

const market = await findHighVolumeLowPriceMarket();

describe('Builders', () => {
  describe('listBuilderTrades', () => {
    it('lists builder-attributed trades', async () => {
      const existingTrades = await listBuilderTrades(publicClientWithBuilderKey)
        .first()
        .then((page) => page.items);

      if (existingTrades.length > 0) {
        expect(existingTrades[0]).toEqual(
          expect.objectContaining({
            builder: builderCredentials.key,
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

      const response = await prepareMarketOrder(secureClient, {
        amount: expectPresent(market.orderMinSize),
        side: OrderSide.BUY,
        tokenId,
      })
        .then(completeWith(walletClient))
        .then(postOrder(secureClient));

      expect(response.ok).toBe(true);

      const newTrades = await waitForBuilderTrades(
        publicClientWithBuilderKey,
        tokenId,
      );

      expect(newTrades[0]).toEqual(
        expect.objectContaining({
          builder: builderCredentials.key,
          id: expect.any(String),
        }),
      );
    });
  });
});

async function waitForBuilderTrades(client: PublicClient, tokenId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { items } = await listBuilderTrades(client, { tokenId }).first();

    if (items.length > 0) {
      return items;
    }

    await delay(500);
  }

  return listBuilderTrades(client, { tokenId })
    .first()
    .then(expectNonEmptyPage)
    .then((page) => page.items);
}
