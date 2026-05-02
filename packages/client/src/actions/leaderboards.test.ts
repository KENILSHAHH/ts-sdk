import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';

describe('Leaderboards', () => {
  describe('listTraderLeaderboard', () => {
    it('lists trader rankings', async () => {
      const result = await publicClient
        .listTraderLeaderboard({
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          rank: expect.any(String),
          wallet: expect.any(String),
        }),
      );
    });
  });

  describe('listBuilderLeaderboard', () => {
    it('lists builder rankings', async () => {
      const result = await publicClient
        .listBuilderLeaderboard({
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          builder: expect.any(String),
          rank: expect.any(String),
        }),
      );
    });
  });

  describe('fetchBuilderVolume', () => {
    it('lists builder volume entries', async () => {
      const result = await publicClient.fetchBuilderVolume({
        timePeriod: 'DAY',
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          builder: expect.any(String),
          bucketAt: expect.any(String),
          volume: expect.any(String),
        }),
      );
    });
  });
});
