import { describe, expect, it } from './fixtures';
import { expectNonEmptyPage } from './helpers';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe('Portfolio', () => {
  describe('listPositions', () => {
    it('lists positions for a wallet', async ({ publicClient }) => {
      const result = await publicClient
        .listPositions({
          user: TEST_USER,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          wallet: TEST_USER,
        }),
      );
    });
  });

  describe('listClosedPositions', () => {
    it('lists closed positions for a wallet', async ({ publicClient }) => {
      const result = await publicClient
        .listClosedPositions({
          user: TEST_USER,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          wallet: TEST_USER,
        }),
      );
    });
  });

  describe('fetchPortfolioValue', () => {
    it('fetches wallet value', async ({ publicClient }) => {
      const result = await publicClient.fetchPortfolioValue({
        user: TEST_USER,
      });

      expect(result).toEqual([
        expect.objectContaining({
          user: TEST_USER,
          value: expect.any(String),
        }),
      ]);
    });
  });

  describe('fetchTradedMarketCount', () => {
    it('fetches total traded market count for a wallet', async ({
      publicClient,
    }) => {
      const result = await publicClient.fetchTradedMarketCount({
        user: TEST_USER,
      });

      expect(result).toEqual(
        expect.objectContaining({
          traded: expect.any(Number),
          user: TEST_USER,
        }),
      );
    });
  });

  describe('downloadAccountingSnapshot', () => {
    it('downloads the accounting snapshot archive', async ({
      publicClient,
    }) => {
      const result = await publicClient.downloadAccountingSnapshot({
        user: TEST_USER,
      });

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
      expect(result.type).toBe('application/zip');
    });
  });
});
