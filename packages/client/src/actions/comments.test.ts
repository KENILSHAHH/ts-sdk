import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import {
  fetchCommentsById,
  fetchCommentsByUserAddress,
  listComments,
} from './comments';
import { listEvents } from './events';

describe('Comments', () => {
  describe('listComments', () => {
    it('fetches comments for an event', async () => {
      const events = await listEvents(publicClient, {
        closed: false,
        limit: 10,
      });

      let result: Awaited<ReturnType<typeof listComments>> = [];

      for (const event of events) {
        result = await listComments(publicClient, {
          parentEntityId: Number(event.id),
          parentEntityType: 'Event',
        });

        if (result.length > 0) {
          break;
        }
      }

      expect(result).toEqual(expect.any(Array));
    });
  });

  describe('fetchCommentsById and fetchCommentsByUserAddress', () => {
    it('fetches related comment threads when a comment is available', async () => {
      const events = await listEvents(publicClient, {
        closed: false,
        limit: 10,
      });

      let comment: Awaited<ReturnType<typeof listComments>>[number] | undefined;

      for (const event of events) {
        const comments = await listComments(publicClient, {
          parentEntityId: Number(event.id),
          parentEntityType: 'Event',
        });

        comment = comments[0];

        if (comment?.userAddress) {
          break;
        }
      }

      if (!comment?.userAddress) {
        return;
      }

      const commentsById = await fetchCommentsById(publicClient, {
        id: Number(comment.id),
      });
      const commentsByUserAddress = await fetchCommentsByUserAddress(
        publicClient,
        {
          address: comment.userAddress,
          limit: 1,
        },
      );

      expect(commentsById).toEqual(expect.any(Array));
      expect(commentsByUserAddress).toEqual(expect.any(Array));
    });
  });
});
