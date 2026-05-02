import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';

describe('Profiles', () => {
  describe('fetchPublicProfile', () => {
    it('fetches a public profile by wallet address', async () => {
      const result = await publicClient.fetchPublicProfile({
        address: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
      });

      expect(result).toEqual(
        expect.objectContaining({
          wallet: expect.any(String),
        }),
      );
    });

    it('returns null when the profile does not exist', async () => {
      await expect(
        publicClient.fetchPublicProfile({
          address: '0x0000000000000000000000000000000000000001',
        }),
      ).resolves.toBeNull();
    });
  });
});
