import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import { listTeams } from './teams';

describe('Teams', () => {
  describe('listTeams', () => {
    it('fetches teams', async () => {
      const result = await listTeams(publicClient, {
        pageSize: 1,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
        }),
      );
    });
  });
});
