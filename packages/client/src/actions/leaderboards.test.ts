import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import {
  listBuilderLeaderboard,
  listBuilderVolume,
  listTraderLeaderboard,
} from './leaderboards';

describe('Leaderboards', () => {
  describe('listTraderLeaderboard', () => {
    it('lists trader rankings', async () => {
      const result = await listTraderLeaderboard(testClient, {
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          proxyWallet: expect.any(String),
          rank: expect.any(String),
        }),
      );
    });
  });

  describe('listBuilderLeaderboard', () => {
    it('lists builder rankings', async () => {
      const result = await listBuilderLeaderboard(testClient, {
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          builder: expect.any(String),
          rank: expect.any(String),
        }),
      );
    });
  });

  describe('listBuilderVolume', () => {
    it('lists builder volume entries', async () => {
      const result = await listBuilderVolume(testClient, {
        timePeriod: 'DAY',
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          builder: expect.any(String),
          dt: expect.any(String),
          volume: expect.any(Number),
        }),
      );
    });
  });
});
