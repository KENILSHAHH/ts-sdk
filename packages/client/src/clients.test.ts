import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import { createTestWalletClient, publicClient } from './testing';
import { authenticateWith } from './viem';

const walletClient = createTestWalletClient();

describe('clients', () => {
  describe('PublicClient.beginAuthentication', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates with a non-zero nonce', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ nonce: 1 })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates twice with the same nonce', async () => {
      const firstClient = await publicClient
        .beginAuthentication({ nonce: 2 })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(firstClient)).resolves.toBeDefined();

      const secondClient = await publicClient
        .beginAuthentication({ nonce: 2 })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secondClient)).resolves.toBeDefined();
    });

    it('reuses stored credentials during authentication when they remain valid', async () => {
      const initialClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));

      const secureClient = await publicClient
        .beginAuthentication({ credentials: initialClient.credentials })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });
});
