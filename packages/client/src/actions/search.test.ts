import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { search } from './search';

describe('Search', () => {
  describe('search', () => {
    it('fetches public search results', async () => {
      const result = await search(testClient, {
        q: 'trump',
        limitPerType: 1,
      });

      expect(result).toEqual(
        expect.objectContaining({
          pagination: expect.objectContaining({
            hasMore: expect.any(Boolean),
          }),
        }),
      );

      if (result.events) {
        expect(result.events).toEqual(expect.any(Array));
      }

      if (result.tags) {
        expect(result.tags).toEqual(expect.any(Array));
      }

      if (result.profiles) {
        expect(result.profiles).toEqual(expect.any(Array));
      }
    });
  });
});
