import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import { createPublicClient } from './clients';
import { createTestWalletClient } from './testing';
import { authenticateWith } from './viem';

describe('Auth', () => {
  describe('authenticate', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const publicClient = createPublicClient();
      const walletClient = createTestWalletClient();

      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });
});
