import { InvariantError } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { fetchApiKeys, fetchPublicProfile } from './actions';
import {
  createRandomWalletClient,
  publicClient,
  safeWalletAddress,
  walletClient,
} from './testing';
import { authenticateWith } from './viem';

describe('clients', () => {
  describe('PublicClient.beginAuthentication', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates with a non-zero nonce', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ nonce: 1, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates twice with the same nonce', async () => {
      const firstClient = await publicClient
        .beginAuthentication({ nonce: 2, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(firstClient)).resolves.toBeDefined();

      const secondClient = await publicClient
        .beginAuthentication({ nonce: 2, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secondClient)).resolves.toBeDefined();
    });

    it('authenticates as EOA when wallet equals signer address', async () => {
      const signerAddress = walletClient.account.address;
      const secureClient = await publicClient
        .beginAuthentication({ wallet: signerAddress })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('rejects with InvariantError when wallet does not match signer or any supported derived wallet', async () => {
      const unrelatedWallet = createRandomWalletClient();

      await expect(
        publicClient
          .beginAuthentication({ wallet: unrelatedWallet.account.address })
          .then(authenticateWith(walletClient)),
      ).rejects.toBeInstanceOf(InvariantError);
    });

    it('reuses stored credentials during authentication when they remain valid', async () => {
      const initialClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      const secureClient = await publicClient
        .beginAuthentication({
          credentials: initialClient.credentials,
          wallet: safeWalletAddress,
        })
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });

  describe('SecureClient.endAuthentication', () => {
    it('returns a public client and invalidates the secure client', async () => {
      const controlClient = await publicClient
        .beginAuthentication({ nonce: 997, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const secureClient = await publicClient
        .beginAuthentication({ nonce: 998, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const revokedKey = secureClient.credentials.key;
      const signer = secureClient.account.signer;

      await expect(fetchApiKeys(controlClient)).resolves.toContain(revokedKey);

      const publicOnlyClient = await secureClient.endAuthentication();
      const remainingApiKeys = await fetchApiKeys(controlClient);

      expect(remainingApiKeys).toContain(controlClient.credentials.key);
      expect(remainingApiKeys).not.toContain(revokedKey);
      await expect(fetchApiKeys(secureClient)).rejects.toBeInstanceOf(
        InvariantError,
      );
      await expect(
        fetchPublicProfile(publicOnlyClient, { address: signer }),
      ).resolves.toBeDefined();
    });
  });
});
