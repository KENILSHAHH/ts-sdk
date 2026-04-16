import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import { fetchSeries, listSeries } from './series';

describe('Series', () => {
  describe('listSeries', () => {
    it('fetches series', async () => {
      const result = await listSeries(publicClient, {
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
        }),
      );
    });
  });

  describe('fetchSeries', () => {
    it('fetches a series by id', async () => {
      const {
        items: [series],
      } = await listSeries(publicClient, {
        pageSize: 1,
      })
        .first()
        .then(expectNonEmptyPage);

      const result = await fetchSeries(publicClient, {
        id: series.id,
      });

      expect(result.id).toBe(series.id);
    });
  });
});
