import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { fetchEvent, fetchEventTags, listEvents } from './events';

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

  describe('fetchEvent', () => {
    it('fetches an event by id and slug', async () => {
      const [event] = await listEvents(testClient, {
        closed: false,
        limit: 1,
      });

      if (!event) {
        throw new Error('Expected at least one event');
      }

      if (!event.slug) {
        throw new Error('Expected the event to have a slug');
      }

      const eventById = await fetchEvent(testClient, {
        id: event.id,
      });

      const eventBySlug = await fetchEvent(testClient, {
        slug: event.slug,
      });

      expect(eventById.id).toBe(event.id);
      expect(eventBySlug.id).toBe(event.id);
    });
  });

  describe('fetchEventTags', () => {
    it("fetches an event's tags by id", async () => {
      const [event] = await listEvents(testClient, {
        closed: false,
        limit: 1,
      });

      if (!event) {
        throw new Error('Expected at least one event');
      }

      const result = await fetchEventTags(testClient, {
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
});
