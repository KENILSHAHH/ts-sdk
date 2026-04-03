import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { fetchSeries, listSeries } from './series';

describe('Series', () => {
  describe('listSeries', () => {
    it('fetches series', async () => {
      const result = await listSeries(testClient, {
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
        }),
      );
    });
  });

  describe('fetchSeries', () => {
    it('fetches a series by id', async () => {
      const [series] = await listSeries(testClient, {
        limit: 1,
      });

      if (!series) {
        throw new Error('Expected at least one series');
      }

      const result = await fetchSeries(testClient, {
        id: series.id,
      });

      expect(result.id).toBe(series.id);
    });
  });
});
