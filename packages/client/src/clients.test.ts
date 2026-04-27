import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress, InvariantError } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import {
  createRandomWalletClient,
  deriveProxyAddress,
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

    it('classifies a deterministic proxy wallet as POLY_PROXY', async () => {
      const signerAddress = expectEvmAddress(walletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);

      const secureClient = await publicClient
        .beginAuthentication({ wallet: proxyWallet })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);
      expect(secureClient.account.wallet).toBe(proxyWallet);
      expect(secureClient.account.signer).toBe(signerAddress);

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
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
      const snapshot = initialClient.getSessionSnapshot();

      const secureClient = await publicClient
        .beginAuthentication(snapshot)
        .then(authenticateWith(walletClient));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('falls back to fresh authentication when a stored session snapshot has been revoked', async () => {
      const controlClient = await publicClient
        .beginAuthentication({ nonce: 1997, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const secureClient = await publicClient
        .beginAuthentication({ nonce: 1998, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const snapshot = secureClient.getSessionSnapshot();
      const revokedKey = snapshot.credentials.key;

      await expect(fetchApiKeys(controlClient)).resolves.toContain(revokedKey);

      await secureClient.endAuthentication();

      const resumedClient = await publicClient
        .beginAuthentication(snapshot)
        .then(authenticateWith(walletClient));
      const remainingApiKeys = await fetchApiKeys(controlClient);

      expect(resumedClient.credentials.key).not.toBe(revokedKey);
      expect(remainingApiKeys).toContain(controlClient.credentials.key);
      expect(remainingApiKeys).toContain(resumedClient.credentials.key);
      expect(remainingApiKeys).not.toContain(revokedKey);
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
        publicOnlyClient.fetchPublicProfile({ address: signer }),
      ).resolves.toBeDefined();
    });

    it('closes active subscription iterators before ending authentication', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ nonce: 999, wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));
      const handle = await secureClient.subscribe([{ topic: 'user' }]);

      await secureClient.endAuthentication();

      await expect(
        handle[Symbol.asyncIterator]().next(),
      ).resolves.toMatchObject({ done: true });
    });
  });
});
