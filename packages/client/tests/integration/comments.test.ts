import { CommentParentEntityType } from '@polymarket/bindings';
import { createPublicClient } from '@polymarket/client';
import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from './fixtures';
import { expectNonEmptyPage } from './helpers';

const {
  items: [event],
} = await createPublicClient()
  .listEvents({
    closed: false,
    pageSize: 1,
  })
  .firstPage()
  .then(expectNonEmptyPage);

const commentEvent = event;

describe('Comments', () => {
  describe('listComments', () => {
    it('fetches comments for an event', async ({ publicClient }) => {
      const { items } = await publicClient
        .listComments({
          parentEntityId: commentEvent.id,
          parentEntityType: CommentParentEntityType.Event,
        })
        .firstPage();

      expect(items).toEqual(expect.any(Array));
    });
  });

  describe('fetchCommentsById', () => {
    it('fetches related comment threads by id', async ({ publicClient }) => {
      const {
        items: [comment],
      } = await publicClient
        .listComments({
          parentEntityId: commentEvent.id,
          parentEntityType: CommentParentEntityType.Event,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const commentsById = await publicClient.fetchCommentsById({
        id: comment.id,
      });

      expect(commentsById).toEqual(expect.any(Array));
    });
  });

  describe('listCommentsByUserAddress', () => {
    it('lists comments by user address', async ({ publicClient }) => {
      const {
        items: [comment],
      } = await publicClient
        .listComments({
          parentEntityId: commentEvent.id,
          parentEntityType: CommentParentEntityType.Event,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const commentsByUserAddress = await publicClient
        .listCommentsByUserAddress({
          address: expectPresent(comment.userAddress),
          pageSize: 1,
        })
        .firstPage();

      expect(commentsByUserAddress.items).toEqual(expect.any(Array));
    });
  });
});
