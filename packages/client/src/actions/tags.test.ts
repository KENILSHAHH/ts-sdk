import { nonEmptyArray, nonNullable } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import {
  fetchRelatedTagResources,
  fetchRelatedTags,
  fetchTag,
  listTags,
} from './tags';

describe('Tags', () => {
  describe('listTags', () => {
    it('fetches tags', async () => {
      const result = await listTags(testClient, {
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

  describe('fetchTag', () => {
    it('fetches a tag by id and slug', async () => {
      const [tag] = await listTags(testClient, {
        limit: 1,
      }).then(nonEmptyArray);

      const tagById = await fetchTag(testClient, { id: tag.id });
      const tagBySlug = await fetchTag(testClient, {
        slug: nonNullable(tag.slug),
      });

      expect(tagById.id).toBe(tag.id);
      expect(tagBySlug.id).toBe(tag.id);
    });
  });

  describe('fetchRelatedTags', () => {
    it('fetches related tag relationships by id and slug', async () => {
      const [tag] = await listTags(testClient, {
        limit: 1,
      }).then(nonEmptyArray);

      const relatedById = await fetchRelatedTags(testClient, {
        id: tag.id,
      });
      const relatedBySlug = await fetchRelatedTags(testClient, {
        slug: nonNullable(tag.slug),
      });

      expect(relatedById).toEqual(expect.any(Array));
      expect(relatedBySlug).toEqual(expect.any(Array));
    });
  });

  describe('fetchRelatedTagResources', () => {
    it('fetches related tags by id and slug', async () => {
      const [tag] = await listTags(testClient, {
        limit: 1,
      }).then(nonEmptyArray);

      const relatedTagsById = await fetchRelatedTagResources(testClient, {
        id: tag.id,
      });
      const relatedTagsBySlug = await fetchRelatedTagResources(testClient, {
        slug: nonNullable(tag.slug),
      });

      expect(relatedTagsById).toEqual(expect.any(Array));
      expect(relatedTagsBySlug).toEqual(expect.any(Array));
    });
  });
});
