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
  .first()
  .then(expectNonEmptyPage);

describe('Comments', () => {
  describe('listComments', () => {
    it('fetches comments for an event', async () => {
      const { items } = await listComments(publicClient, {
        parentEntityId: event.id,
        parentEntityType: 'Event',
      }).first();

      expect(items).toEqual(expect.any(Array));
    });
  });

  describe('fetchCommentsById and listCommentsByUserAddress', () => {
    it('fetches related comment threads when a comment is available', async () => {
      const {
        items: [comment],
      } = await listComments(publicClient, {
        parentEntityId: event.id,
        parentEntityType: 'Event',
      })
        .first()
        .then(expectNonEmptyPage);

      const commentsById = await fetchCommentsById(publicClient, {
        id: comment.id,
      });
      const commentsByUserAddress = await listCommentsByUserAddress(
        publicClient,
        {
          address: expectPresent(comment.userAddress),
          limit: 1,
        },
      );

      expect(commentsById).toEqual(expect.any(Array));
      expect(commentsByUserAddress).toEqual(expect.any(Array));
    });
  });
});
