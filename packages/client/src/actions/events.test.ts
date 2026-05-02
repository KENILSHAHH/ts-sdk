import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { UserInputError } from '../errors';
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

    it('fetches an event by URL', async () => {
      const {
        items: [event],
      } = await publicClient
        .listEvents({
          closed: false,
          pageSize: 1,
        })
        .firstPage()
        .then(expectNonEmptyPage);

      const eventByUrl = await publicClient.fetchEvent({
        url: `https://polymarket.com/event/${expectPresent(event.slug)}`,
      });

      expect(eventByUrl.id).toBe(event.id);
    });

    it('rejects invalid and non-event URLs', async () => {
      await expect(
        publicClient.fetchEvent({
          url: 'not-a-url',
        }),
      ).rejects.toThrow(UserInputError);

      await expect(
        publicClient.fetchEvent({
          url: 'https://example.com/event/presidential-election-2028',
        }),
      ).rejects.toThrow(UserInputError);

      await expect(
        publicClient.fetchEvent({
          url: 'https://polymarket.com/market/some-market-slug',
        }),
      ).rejects.toThrow(UserInputError);
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
          total: expect.any(String),
        }),
      );
    });
  });
});
