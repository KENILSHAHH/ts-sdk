import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import {
  fetchPortfolioValue,
  fetchTradedMarketCount,
  listClosedPositions,
  listPositions,
} from './portfolio';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe('Portfolio', () => {
  describe('listPositions', () => {
    it('lists positions for a wallet', async () => {
      const result = await listPositions(testClient, {
        user: TEST_USER,
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          proxyWallet: TEST_USER,
        }),
      );
    });
  });

  describe('listClosedPositions', () => {
    it('lists closed positions for a wallet', async () => {
      const result = await listClosedPositions(testClient, {
        user: TEST_USER,
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          proxyWallet: TEST_USER,
        }),
      );
    });
  });

  describe('fetchPortfolioValue', () => {
    it('fetches wallet value', async () => {
      const result = await fetchPortfolioValue(testClient, {
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
      const result = await fetchTradedMarketCount(testClient, {
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
});
