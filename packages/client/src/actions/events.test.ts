import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';

describe('Events', () => {
  describe('listEvents', () => {
    it('fetches events from Gamma', async () => {
      const paginator = publicClient.listEvents({
        closed: false,
        pageSize: 1,
      });
      const firstPage = await paginator.firstPage();

      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.nextCursor).toBeDefined();

      let fetched = 0;

      for await (const page of paginator.from(firstPage.nextCursor)) {
        expect(page.items).toHaveLength(1);

        if (++fetched === 3) {
          break;
        }
      }
    });
  });

  describe('fetchEvent', () => {
    it('fetches an event by id and slug', async () => {
      const {
        items: [event],
      } = await publicClient
        .listEvents({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const eventById = await publicClient.fetchEvent({
        id: event.id,
      });

      const eventBySlug = await publicClient.fetchEvent({
        slug: expectPresent(event.slug),
      });

      expect(eventById.id).toBe(event.id);
      expect(eventBySlug.id).toBe(event.id);
    });
  });

  describe('fetchEventTags', () => {
    it("fetches an event's tags by id", async () => {
      const {
        items: [event],
      } = await publicClient
        .listEvents({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const result = await publicClient.fetchEventTags({
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
      const {
        items: [event],
      } = await publicClient
        .listEvents({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const result = await publicClient.fetchEventLiveVolume({
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
