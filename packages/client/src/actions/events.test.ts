import { expectNonEmptyArray, expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import {
  fetchEvent,
  fetchEventLiveVolume,
  fetchEventTags,
  listEvents,
} from './events';

describe('Events', () => {
  describe('listEvents', () => {
    it('fetches events from Gamma', async () => {
      const result = await listEvents(publicClient, {
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

  describe('fetchEvent', () => {
    it('fetches an event by id and slug', async () => {
      const [event] = await listEvents(publicClient, {
        closed: false,
        limit: 1,
      }).then(expectNonEmptyArray);

      const eventById = await fetchEvent(publicClient, {
        id: event.id,
      });

      const eventBySlug = await fetchEvent(publicClient, {
        slug: expectPresent(event.slug),
      });

      expect(eventById.id).toBe(event.id);
      expect(eventBySlug.id).toBe(event.id);
    });
  });

  describe('fetchEventTags', () => {
    it("fetches an event's tags by id", async () => {
      const [event] = await listEvents(publicClient, {
        closed: false,
        limit: 1,
      }).then(expectNonEmptyArray);

      const result = await fetchEventTags(publicClient, {
        id: event.id,
      });

      expect(result).toEqual(expect.any(Array));

      for (const tag of result) {
        expect(tag).toEqual(
          expect.objectContaining({
            id: expect.any(String),
          }),
        );
      }
    });
  });

  describe('fetchEventLiveVolume', () => {
    it('fetches live volume for an event', async () => {
      const [event] = await listEvents(publicClient, {
        closed: false,
        limit: 1,
      }).then(expectNonEmptyArray);

      const result = await fetchEventLiveVolume(publicClient, {
        id: event.id,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          markets: expect.any(Array),
          total: expect.any(Number),
        }),
      );
    });
  });
});
