import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';

const TEST_TAG = {
  id: '144',
  slug: 'elections',
} as const;

describe('Tags', () => {
  describe('listTags', () => {
    it('fetches tags', async () => {
      const result = await publicClient
        .listTags({
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

  describe('fetchTag', () => {
    it('fetches a tag by id and slug', async () => {
      const tagById = await publicClient.fetchTag({ id: TEST_TAG.id });
      const tagBySlug = await publicClient.fetchTag({
        slug: TEST_TAG.slug,
      });

      expect(tagById.id).toBe(TEST_TAG.id);
      expect(tagBySlug.id).toBe(TEST_TAG.id);
    });
  });

  describe('fetchRelatedTags', () => {
    it('fetches related tag relationships by id and slug', async () => {
      const relatedById = await publicClient.fetchRelatedTags({
        id: TEST_TAG.id,
      });
      const relatedBySlug = await publicClient.fetchRelatedTags({
        slug: TEST_TAG.slug,
      });

      expect(relatedById).toEqual(expect.any(Array));
      expect(relatedBySlug).toEqual(expect.any(Array));
    });
  });

  describe('fetchRelatedTagResources', () => {
    it('fetches related tags by id and slug', async () => {
      const relatedTagsById = await publicClient.fetchRelatedTagResources({
        id: TEST_TAG.id,
      });
      const relatedTagsBySlug = await publicClient.fetchRelatedTagResources({
        slug: TEST_TAG.slug,
      });

      expect(relatedTagsById).toEqual(expect.any(Array));
      expect(relatedTagsBySlug).toEqual(expect.any(Array));
    });
  });
});
