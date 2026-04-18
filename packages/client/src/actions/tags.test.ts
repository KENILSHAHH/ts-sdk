import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import {
  fetchRelatedTagResources,
  fetchRelatedTags,
  fetchTag,
  listTags,
} from './tags';

describe('Tags', () => {
  describe('listTags', () => {
    it('fetches tags', async () => {
      const result = await listTags(publicClient, {
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
      const {
        items: [tag],
      } = await listTags(publicClient, {
        pageSize: 1,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      const tagById = await fetchTag(publicClient, { id: tag.id });
      const tagBySlug = await fetchTag(publicClient, {
        slug: expectPresent(tag.slug),
      });

      expect(tagById.id).toBe(tag.id);
      expect(tagBySlug.id).toBe(tag.id);
    });
  });

  describe('fetchRelatedTags', () => {
    it('fetches related tag relationships by id and slug', async () => {
      const {
        items: [tag],
      } = await listTags(publicClient, {
        pageSize: 1,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      const relatedById = await fetchRelatedTags(publicClient, {
        id: tag.id,
      });
      const relatedBySlug = await fetchRelatedTags(publicClient, {
        slug: expectPresent(tag.slug),
      });

      expect(relatedById).toEqual(expect.any(Array));
      expect(relatedBySlug).toEqual(expect.any(Array));
    });
  });

  describe('fetchRelatedTagResources', () => {
    it('fetches related tags by id and slug', async () => {
      const {
        items: [tag],
      } = await listTags(publicClient, {
        pageSize: 1,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      const relatedTagsById = await fetchRelatedTagResources(publicClient, {
        id: tag.id,
      });
      const relatedTagsBySlug = await fetchRelatedTagResources(publicClient, {
        slug: expectPresent(tag.slug),
      });

      expect(relatedTagsById).toEqual(expect.any(Array));
      expect(relatedTagsBySlug).toEqual(expect.any(Array));
    });
  });
});
