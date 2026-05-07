import { describe, expect, it } from './fixtures';

describe('Search', () => {
  describe('search', () => {
    it('fetches public search results', async ({ publicClient }) => {
      const paginator = publicClient.search({
        q: 'trump',
        pageSize: 1,
        searchProfiles: true,
        searchTags: true,
      });
      const firstPage = await paginator.firstPage();

      expect(firstPage).toEqual(
        expect.objectContaining({
          hasMore: expect.any(Boolean),
          items: expect.objectContaining({
            events: expect.any(Array),
            profiles: expect.any(Array),
            tags: expect.any(Array),
          }),
        }),
      );

      if (firstPage.hasMore) {
        const nextPage = await paginator.from(firstPage.nextCursor).firstPage();

        expect(nextPage.items).toEqual(
          expect.objectContaining({
            events: expect.any(Array),
            profiles: expect.any(Array),
            tags: expect.any(Array),
          }),
        );
      }
    });
  });
});
