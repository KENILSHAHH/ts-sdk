import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import {
  fetchCommentsById,
  fetchCommentsByUserAddress,
  listComments,
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
      const comments = await listComments(publicClient, {
        parentEntityId: event.id,
        parentEntityType: 'Event',
      });

      expect(comments).toEqual(expect.any(Array));
    });
  });

  describe('fetchCommentsById and fetchCommentsByUserAddress', () => {
    it('fetches related comment threads when a comment is available', async () => {
      const comments = await listComments(publicClient, {
        parentEntityId: event.id,
        parentEntityType: 'Event',
      });
      const comment = expectPresent(comments[0]);

      const commentsById = await fetchCommentsById(publicClient, {
        id: comment.id,
      });
      const commentsByUserAddress = await fetchCommentsByUserAddress(
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
