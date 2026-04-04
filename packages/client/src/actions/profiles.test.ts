import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import { fetchPublicProfile } from './profiles';

describe('Profiles', () => {
  describe('fetchPublicProfile', () => {
    it('fetches a public profile by wallet address', async () => {
      const result = await fetchPublicProfile(publicClient, {
        address: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
      });

      expect(result).toEqual(
        expect.objectContaining({
          proxyWallet: expect.any(String),
        }),
      );
    });
  });
});
