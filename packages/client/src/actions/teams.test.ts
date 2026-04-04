import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import { listTeams } from './teams';

describe('Teams', () => {
  describe('listTeams', () => {
    it('fetches teams', async () => {
      const result = await listTeams(publicClient, {
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
        }),
      );
    });
  });
});
