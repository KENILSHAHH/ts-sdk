import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import { createPublicClient } from './clients';
import { createTestWalletClient } from './testing';
import { authenticateWith } from './viem';

const walletClient = createTestWalletClient();

describe('Auth', () => {
  describe('authenticate', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const publicClient = createPublicClient();

      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });
});
