import { OrderSide } from '@polymarket/bindings';
import { PriceHistoryInterval } from '@polymarket/bindings/clob';
import { expectPresent, never } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import {
  fetchFeeRate,
  fetchLastTradePrice,
  fetchLastTradePrices,
  fetchMidpoint,
  fetchMidpoints,
  fetchNegRisk,
  fetchOrderBook,
  fetchOrderBooks,
  fetchPrice,
  fetchPriceHistory,
  fetchPrices,
  fetchSpread,
  fetchSpreads,
  fetchTickSize,
  listCurrentRewards,
  listMarketRewards,
} from './clob';
import { listMarkets } from './markets';

describe('CLOB', () => {
  describe('fetchTickSize', () => {
    it('fetches the minimum tick size for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchTickSize(publicClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('fetchNegRisk', () => {
    it('fetches whether a token is negative risk', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchNegRisk(publicClient, {
        tokenId,
      });

      expect(typeof result).toBe('boolean');
    });
  });

  describe('fetchFeeRate', () => {
    it('fetches the fee rate for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchFeeRate(publicClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fetchOrderBook', () => {
    it('fetches the order book for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchOrderBook(publicClient, {
        tokenId,
      });

      expect(result.tokenId).toBe(tokenId);
      expect(Array.isArray(result.bids)).toBe(true);
      expect(Array.isArray(result.asks)).toBe(true);
      expect(result.tickSize).toEqual(expect.any(String));
      expect(result.minOrderSize).toEqual(expect.any(String));
      expect(result.negRisk).toEqual(expect.any(Boolean));
      expect(result.hash).toEqual(expect.any(String));
    });
  });

  describe('fetchOrderBooks', () => {
    it('fetches order books for multiple tokens', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchOrderBooks(publicClient, [{ tokenId }]);

      expect(result[0]).toEqual(
        expect.objectContaining({
          tokenId,
          asks: expect.any(Array),
          bids: expect.any(Array),
        }),
      );
    });
  });

  describe('fetchMidpoint', () => {
    it('fetches the midpoint price for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchMidpoint(publicClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(String));
    });
  });

  describe('fetchMidpoints', () => {
    it('fetches midpoint prices for multiple tokens', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchMidpoints(publicClient, [{ tokenId }]);

      expect(result[tokenId]).toEqual(expect.any(String));
    });
  });

  describe('fetchPrice', () => {
    it('fetches the quoted price for a token and side', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchPrice(publicClient, {
        tokenId,
        side: OrderSide.BUY,
      });

      expect(result).toEqual(expect.any(String));
    });
  });

  describe('fetchPrices', () => {
    it('fetches quoted prices for multiple tokens', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchPrices(publicClient, [
        {
          tokenId,
          side: OrderSide.BUY,
        },
      ]);

      expect(result[tokenId]?.BUY).toEqual(expect.any(String));
    });
  });

  describe('fetchSpread', () => {
    it('fetches the spread for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchSpread(publicClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(String));
    });
  });

  describe('fetchSpreads', () => {
    it('fetches spreads for multiple tokens', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchSpreads(publicClient, [{ tokenId }]);

      expect(result[tokenId]).toEqual(expect.any(String));
    });
  });

  describe('fetchLastTradePrice', () => {
    it('fetches the last traded price for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchLastTradePrice(publicClient, {
        tokenId,
      });

      expect(result).toEqual(
        expect.objectContaining({
          price: expect.any(String),
          side: expect.any(String),
        }),
      );
    });
  });

  describe('fetchLastTradePrices', () => {
    it('fetches last traded prices for multiple tokens', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchLastTradePrices(publicClient, [{ tokenId }]);

      expect(result[0]).toEqual(
        expect.objectContaining({
          price: expect.any(String),
          side: expect.any(String),
          tokenId,
        }),
      );
    });
  });

  describe('fetchPriceHistory', () => {
    it('lists historical price points for a token', async () => {
      const tokenId = await selectLiquidClobTokenId();

      const result = await fetchPriceHistory(publicClient, {
        tokenId,
        interval: PriceHistoryInterval.ONE_DAY,
        fidelity: 60,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          p: expect.any(Number),
          t: expect.any(Number),
        }),
      );
    });
  });

  describe('listCurrentRewards', () => {
    it('lists current active market rewards', async () => {
      await expect(
        listCurrentRewards(publicClient).firstPage(),
      ).resolves.toBeDefined();
    });
  });

  describe('listMarketRewards', () => {
    it('fetches reward configurations for a market', async () => {
      const currentRewards = await listCurrentRewards(publicClient).firstPage();

      const currentReward = currentRewards.items[0];

      if (currentReward === undefined) {
        return;
      }

      const result = await listMarketRewards(publicClient, {
        conditionId: currentReward.conditionId,
      }).firstPage();

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: currentReward.conditionId,
          question: expect.any(String),
          tokens: expect.any(Array),
        }),
      );
    });
  });
});

async function selectLiquidClobTokenId(): Promise<string> {
  const markets = await listMarkets(publicClient, {
    closed: false,
    pageSize: 100,
    order: 'volume24hr',
    ascending: false,
  })
    .firstPage()
    .then((page) => page.items);

  for (const market of markets) {
    const [tokenId] = expectPresent(market.clobTokenIds);

    return tokenId;
  }

  never('Expected at least one live market with a CLOB token id');
}
