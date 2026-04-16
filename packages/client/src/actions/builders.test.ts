import { OrderSide } from '@polymarket/bindings/clob';
import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import type { PublicClient } from '../clients';
import {
  findHighVolumeLowPriceMarket,
  publicClientWithBuilderKey,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { authenticateWith, completeWith } from '../viem';
import { listBuilderTrades } from './builders';
import { postOrder, prepareMarketOrder } from './orders';

describe('Builders', () => {
  describe('listBuilderTrades', () => {
    it('lists builder trades', async () => {
      const result = await listBuilderTrades(publicClientWithBuilderKey);

      expect(Array.isArray(result)).toBe(true);
    });

    it.skip('records at least one builder-attributed trade, placing one minimum-size market order only when needed', async () => {
      const client = publicClientWithBuilderKey;
      const existingTrades = await listBuilderTrades(client);

      if (existingTrades.length > 0) {
        expect(existingTrades[0]).toEqual(
          expect.objectContaining({
            builder: expect.any(String),
            id: expect.any(String),
          }),
        );
        return;
      }

      const secureClient = await client
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const market = await findHighVolumeLowPriceMarket();
      const [tokenId] = expectPresent(market.clobTokenIds);

      const order = await prepareMarketOrder(secureClient, {
        amount: expectPresent(market.orderMinSize),
        side: OrderSide.BUY,
        tokenId,
      }).then(completeWith(walletClient));

      const response = await postOrder(secureClient, order);

      expect(response.ok).toBe(true);

      const trades = await waitForBuilderTrades(client, tokenId);

      expect(trades).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            assetId: tokenId,
            builder: expect.any(String),
            id: expect.any(String),
          }),
        ]),
      );
    });
  });
});

async function waitForBuilderTrades(client: PublicClient, tokenId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const trades = await listBuilderTrades(client, { tokenId });

    if (trades.length > 0) {
      return trades;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return listBuilderTrades(client, { tokenId });
}
