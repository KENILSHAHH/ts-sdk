import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';

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
      const {
        items: [tag],
      } = await publicClient
        .listTags({
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const tagById = await publicClient.fetchTag({ id: tag.id });
      const tagBySlug = await publicClient.fetchTag({
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
      } = await publicClient
        .listTags({
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const relatedById = await publicClient.fetchRelatedTags({
        id: tag.id,
      });
      const relatedBySlug = await publicClient.fetchRelatedTags({
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
      } = await publicClient
        .listTags({
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const relatedTagsById = await publicClient.fetchRelatedTagResources({
        id: tag.id,
      });
      const relatedTagsBySlug = await publicClient.fetchRelatedTagResources({
        slug: expectPresent(tag.slug),
      });

      expect(relatedTagsById).toEqual(expect.any(Array));
      expect(relatedTagsBySlug).toEqual(expect.any(Array));
    });
  });
});
