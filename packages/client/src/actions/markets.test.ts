import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { UserInputError } from '../errors';
import { expectNonEmptyPage, publicClient } from '../testing';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

async function findPositionConditionId(): Promise<string> {
  const {
    items: [position],
  } = await publicClient
    .listPositions({
      user: TEST_USER,
      pageSize: 1,
    })
    .firstPage()
    .then(expectNonEmptyPage);

  return expectPresent(position.conditionId);
}

describe('Markets', () => {
  describe('listMarkets', () => {
    it('fetches markets from Gamma', async () => {
      const paginator = publicClient.listMarkets({
        closed: false,
        pageSize: 1,
      });
      const firstPage = await paginator.firstPage();

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
      } = await publicClient
        .listMarkets({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const marketById = await publicClient.fetchMarket({
        id: market.id,
      });

      const marketBySlug = await publicClient.fetchMarket({
        slug: expectPresent(market.slug),
      });

      expect(marketById.id).toBe(market.id);
      expect(marketBySlug.id).toBe(market.id);
    });

    it('fetches a market by URL', async () => {
      const {
        items: [market],
      } = await publicClient
        .listMarkets({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const marketByUrl = await publicClient.fetchMarket({
        url: `https://polymarket.com/market/${expectPresent(market.slug)}`,
      });

      expect(marketByUrl.id).toBe(market.id);
    });

    it('rejects invalid and non-market URLs', async () => {
      await expect(
        publicClient.fetchMarket({
          url: 'not-a-url',
        }),
      ).rejects.toThrow(UserInputError);

      await expect(
        publicClient.fetchMarket({
          url: 'https://example.com/market/some-market-slug',
        }),
      ).rejects.toThrow(UserInputError);

      await expect(
        publicClient.fetchMarket({
          url: 'https://polymarket.com/event/presidential-election-2028',
        }),
      ).rejects.toThrow(UserInputError);
    });
  });

  describe('fetchMarketTags', () => {
    it("fetches a market's tags by id", async () => {
      const {
        items: [market],
      } = await publicClient
        .listMarkets({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const result = await publicClient.fetchMarketTags({
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

      const result = await publicClient.listMarketHolders({
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

      const result = await publicClient.listOpenInterest({
        market: [market],
      });

      expect(result).toEqual([
        expect.objectContaining({
          market,
          value: expect.any(String),
        }),
      ]);
    });
  });

  describe('listMarketPositions', () => {
    it('lists positions for a market', async () => {
      const market = await findPositionConditionId();

      const result = await publicClient
        .listMarketPositions({
          market,
          pageSize: 1,
        })
        .firstPage()
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
