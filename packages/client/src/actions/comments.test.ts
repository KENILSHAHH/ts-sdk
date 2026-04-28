import { CommentParentEntityType } from '@polymarket/bindings';
import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';

const {
  items: [event],
} = await publicClient
  .listEvents({
    closed: false,
    pageSize: 1,
  })
  .firstPage()
  .then(expectNonEmptyPage);

describe('Comments', () => {
  describe('listComments', () => {
    it('fetches comments for an event', async () => {
      const { items } = await publicClient
        .listComments({
          parentEntityId: event.id,
          parentEntityType: CommentParentEntityType.Event,
        })
        .firstPage();

      expect(items).toEqual(expect.any(Array));
    });
  });

  describe('fetchCommentsById and listCommentsByUserAddress', () => {
    it('fetches related comment threads when a comment is available', async () => {
      const {
        items: [comment],
      } = await publicClient
        .listComments({
          parentEntityId: event.id,
          parentEntityType: CommentParentEntityType.Event,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const commentsById = await publicClient.fetchCommentsById({
        id: comment.id,
      });
      const commentsByUserAddress = await publicClient
        .listCommentsByUserAddress({
          address: expectPresent(comment.userAddress),
          pageSize: 1,
        })
        .firstPage();

      expect(commentsById).toEqual(expect.any(Array));
      expect(commentsByUserAddress.items).toEqual(expect.any(Array));
    });
  });
});
