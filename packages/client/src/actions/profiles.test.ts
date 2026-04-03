import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { fetchPublicProfile } from './profiles';

describe('Profiles', () => {
  describe('fetchPublicProfile', () => {
    it('fetches a public profile by wallet address', async () => {
      const result = await fetchPublicProfile(testClient, {
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
