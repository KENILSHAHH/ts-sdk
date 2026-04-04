import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import { fetchSportsMarketTypes, listSports } from './sports';

describe('Sports', () => {
  describe('listSports', () => {
    it('fetches sports metadata', async () => {
      const result = await listSports(publicClient);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          sport: expect.any(String),
        }),
      );
    });
  });

  describe('fetchSportsMarketTypes', () => {
    it('fetches sports market types', async () => {
      const result = await fetchSportsMarketTypes(publicClient);

      expect(result.marketTypes).toEqual(expect.any(Array));
      expect(result.marketTypes?.length).toBeGreaterThan(0);
    });
  });
});
