import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';

describe('Series', () => {
  describe('listSeries', () => {
    it('fetches series', async () => {
      const result = await publicClient
        .listSeries({
          pageSize: 1,
        })
        .firstPage()
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
      } = await publicClient
        .listSeries({
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const result = await publicClient.fetchSeries({
        id: series.id,
      });

      expect(result.id).toBe(series.id);
    });
  });
});
