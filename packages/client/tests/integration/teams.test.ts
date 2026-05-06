import { describe, expect, it } from './fixtures';
import { expectNonEmptyPage } from './helpers';

describe('Teams', () => {
  describe('listTeams', () => {
    it('fetches teams', async ({ publicClient }) => {
      const result = await publicClient
        .listTeams({
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
