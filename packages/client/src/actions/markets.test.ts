import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
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

async function findPositionConditionId(): Promise<string> {
  const {
    items: [position],
  } = await listPositions(publicClient, {
    user: TEST_USER,
    pageSize: 1,
  })
    .first()
    .then(expectNonEmptyPage);

  return expectPresent(position.conditionId);
}

describe('Markets', () => {
  describe('listMarkets', () => {
    it('fetches markets from Gamma', async () => {
      const paginator = listMarkets(publicClient, {
        closed: false,
        pageSize: 1,
      });
      const firstPage = await paginator.first();

      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.nextCursor).toBeDefined();

      let fetched = 0;

      for await (const page of paginator.from(firstPage.nextCursor)) {
        expect(page.items).toHaveLength(1);

        if (++fetched === 3) {
          break;
        }
      }
    });
  });

  describe('fetchMarket', () => {
    it('fetches a market by id and slug', async () => {
      const {
        items: [market],
      } = await listMarkets(publicClient, {
        closed: false,
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

      const marketById = await fetchMarket(publicClient, {
        id: market.id,
      });

      const marketBySlug = await fetchMarket(publicClient, {
        slug: expectPresent(market.slug),
      });

      expect(marketById.id).toBe(market.id);
      expect(marketBySlug.id).toBe(market.id);
    });
  });

  describe('fetchMarketTags', () => {
    it("fetches a market's tags by id", async () => {
      const {
        items: [market],
      } = await listMarkets(publicClient, {
        closed: false,
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

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
      const market = await findPositionConditionId();

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
      const market = await findPositionConditionId();

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
      const market = await findPositionConditionId();

      const result = await listMarketPositions(publicClient, {
        market,
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          positions: expect.any(Array),
          token: expect.any(String),
        }),
      );
    });
  });
});
