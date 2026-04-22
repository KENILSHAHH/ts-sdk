import { CommentParentEntityType } from '@polymarket/bindings';
import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import {
  fetchCommentsById,
  listComments,
  listCommentsByUserAddress,
} from './comments';
import { listEvents } from './events';

const {
  items: [event],
} = await listEvents(publicClient, {
  closed: false,
  pageSize: 1,
})
  .firstPage()
  .then(expectNonEmptyPage);

describe('Comments', () => {
  describe('listComments', () => {
    it('fetches comments for an event', async () => {
      const { items } = await listComments(publicClient, {
        parentEntityId: event.id,
        parentEntityType: CommentParentEntityType.Event,
      }).firstPage();

      expect(items).toEqual(expect.any(Array));
    });
  });

  describe('fetchCommentsById and listCommentsByUserAddress', () => {
    it('fetches related comment threads when a comment is available', async () => {
      const {
        items: [comment],
      } = await listComments(publicClient, {
        parentEntityId: event.id,
        parentEntityType: CommentParentEntityType.Event,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      const commentsById = await fetchCommentsById(publicClient, {
        id: comment.id,
      });
      const commentsByUserAddress = await listCommentsByUserAddress(
        publicClient,
        {
          address: expectPresent(comment.userAddress),
          pageSize: 1,
        },
      ).firstPage();

      expect(commentsById).toEqual(expect.any(Array));
      expect(commentsByUserAddress.items).toEqual(expect.any(Array));
    });
  });
});
