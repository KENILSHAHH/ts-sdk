import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import {
  downloadAccountingSnapshot,
  fetchPortfolioValue,
  fetchTradedMarketCount,
  listClosedPositions,
  listPositions,
} from './portfolio';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe('Portfolio', () => {
  describe('listPositions', () => {
    it('lists positions for a wallet', async () => {
      const result = await listPositions(publicClient, {
        user: TEST_USER,
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          proxyWallet: TEST_USER,
        }),
      );
    });
  });

  describe('listClosedPositions', () => {
    it('lists closed positions for a wallet', async () => {
      const result = await listClosedPositions(publicClient, {
        user: TEST_USER,
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          proxyWallet: TEST_USER,
        }),
      );
    });
  });

  describe('fetchPortfolioValue', () => {
    it('fetches wallet value', async () => {
      const result = await fetchPortfolioValue(publicClient, {
        user: TEST_USER,
      });

      expect(result).toEqual([
        expect.objectContaining({
          user: TEST_USER,
          value: expect.any(Number),
        }),
      ]);
    });
  });

  describe('fetchTradedMarketCount', () => {
    it('fetches total traded market count for a wallet', async () => {
      const result = await fetchTradedMarketCount(publicClient, {
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
    it('downloads the accounting snapshot archive', async () => {
      const result = await downloadAccountingSnapshot(publicClient, {
        user: TEST_USER,
      });

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
      expect(result.type).toBe('application/zip');
    });
  });
});
