import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import {
  listBuilderLeaderboard,
  listBuilderVolume,
  listTraderLeaderboard,
} from './leaderboards';

describe('Leaderboards', () => {
  describe('listTraderLeaderboard', () => {
    it('lists trader rankings', async () => {
      const result = await listTraderLeaderboard(publicClient, {
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
      const result = await listBuilderLeaderboard(publicClient, {
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
      const result = await listBuilderVolume(publicClient, {
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
