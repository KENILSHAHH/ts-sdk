import { nonEmptyArray, nonNullable } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import {
  fetchMarket,
  fetchMarketTags,
  listMarketHolders,
  listMarketPositions,
  listMarkets,
  listOpenInterest,
} from './markets';
import { listPositions } from './portfolio';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function getPositionMarket(): Promise<string> {
  const [position] = await listPositions(publicClient, {
    user: TEST_USER,
    limit: 1,
  }).then(nonEmptyArray);

  return nonNullable(position.conditionId);
}

describe('Markets', () => {
  describe('listMarkets', () => {
    it('fetches markets from Gamma', async () => {
      const result = await listMarkets(publicClient, {
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
      const [market] = await listMarkets(publicClient, {
        closed: false,
        limit: 1,
      }).then(nonEmptyArray);

      const marketById = await fetchMarket(publicClient, {
        id: market.id,
      });

      const marketBySlug = await fetchMarket(publicClient, {
        slug: nonNullable(market.slug),
      });

      expect(marketById.id).toBe(market.id);
      expect(marketBySlug.id).toBe(market.id);
    });
  });

  describe('fetchMarketTags', () => {
    it("fetches a market's tags by id", async () => {
      const [market] = await listMarkets(publicClient, {
        closed: false,
        limit: 1,
      }).then(nonEmptyArray);

      const result = await fetchMarketTags(publicClient, {
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

  describe('listMarketHolders', () => {
    it('lists top holders for a market', async () => {
      const market = await getPositionMarket();

      const result = await listMarketHolders(publicClient, {
        market: [market],
        limit: 1,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          holders: expect.any(Array),
          token: expect.any(String),
        }),
      );
    });
  });

  describe('listOpenInterest', () => {
    it('lists open interest for a market', async () => {
      const market = await getPositionMarket();

      const result = await listOpenInterest(publicClient, {
        market: [market],
      });

      expect(result).toEqual([
        expect.objectContaining({
          market,
          value: expect.any(Number),
        }),
      ]);
    });
  });

  describe('listMarketPositions', () => {
    it('lists positions for a market', async () => {
      const market = await getPositionMarket();

      const result = await listMarketPositions(publicClient, {
        market,
        limit: 1,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          positions: expect.any(Array),
          token: expect.any(String),
        }),
      );
    });
  });
});
