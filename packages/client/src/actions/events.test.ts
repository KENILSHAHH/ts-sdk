import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { listEvents } from './events';

describe('Events', () => {
  describe('listEvents', () => {
    it('fetches events from Gamma', async () => {
      const result = await listEvents(testClient, {
        closed: false,
        limit: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          markets: expect.any(Array),
        }),
      );
    });
  });
});
