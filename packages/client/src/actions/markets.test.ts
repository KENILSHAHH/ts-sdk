import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { fetchMarket, fetchMarketTags, listMarkets } from './markets';

describe('Markets', () => {
  describe('listMarkets', () => {
    it('fetches markets from Gamma', async () => {
      const result = await listMarkets(testClient, {
        active: true,
        closed: false,
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          id: expect.any(String),
          marketMakerAddress: expect.any(String),
        }),
      );
    });
  });

  describe('fetchMarket', () => {
    it('fetches a market by id and slug', async () => {
      const [market] = await listMarkets(testClient, {
        active: true,
        closed: false,
        limit: 1,
      });

      if (!market) {
        throw new Error('Expected at least one market');
      }

      if (!market.slug) {
        throw new Error('Expected the market to have a slug');
      }

      const marketById = await fetchMarket(testClient, {
        id: market.id,
      });

      const marketBySlug = await fetchMarket(testClient, {
        slug: market.slug,
      });

      expect(marketById.id).toBe(market.id);
      expect(marketBySlug.id).toBe(market.id);
    });
  });

  describe('fetchMarketTags', () => {
    it("fetches a market's tags by id", async () => {
      const [market] = await listMarkets(testClient, {
        active: true,
        closed: false,
        limit: 1,
      });

      if (!market) {
        throw new Error('Expected at least one market');
      }

      const result = await fetchMarketTags(testClient, {
        id: market.id,
      });

      expect(result).toEqual(expect.any(Array));

      for (const tag of result) {
        expect(tag).toEqual(
          expect.objectContaining({
            id: expect.any(String),
          }),
        );
      }
    });
  });
});
