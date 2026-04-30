import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress, InvariantError } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import { createSecureClient } from './clients';
import {
  createRandomWalletClient,
  createTestSecureClient,
  deriveProxyAddress,
  walletClient,
} from './testing';
import { signerFrom } from './viem';

describe('clients', () => {
  describe('createSecureClient', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await createTestSecureClient();

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates with a non-zero nonce', async () => {
      const secureClient = await createTestSecureClient({ nonce: 1 });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates twice with the same nonce', async () => {
      const firstClient = await createTestSecureClient({ nonce: 2 });

      await expect(fetchApiKeys(firstClient)).resolves.toBeDefined();

      const secondClient = await createTestSecureClient({ nonce: 2 });

      await expect(fetchApiKeys(secondClient)).resolves.toBeDefined();
    });

    it('classifies a deterministic proxy wallet as POLY_PROXY', async () => {
      const signerAddress = expectEvmAddress(walletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);

      const secureClient = await createTestSecureClient({
        wallet: proxyWallet,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);
      expect(secureClient.account.wallet).toBe(proxyWallet);
      expect(secureClient.account.signer).toBe(signerAddress);

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates as EOA when wallet equals signer address', async () => {
      const signerAddress = walletClient.account.address;
      const secureClient = await createTestSecureClient({
        wallet: signerAddress,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('rejects with InvariantError when wallet does not match signer or any supported derived wallet', async () => {
      const unrelatedWallet = createRandomWalletClient();

      await expect(
        createSecureClient({
          wallet: unrelatedWallet.account.address,
          signer: signerFrom(walletClient),
        }),
      ).rejects.toBeInstanceOf(InvariantError);
    });

    it('reuses stored credentials during authentication when they remain valid', async () => {
      const initialClient = await createTestSecureClient();
      const { credentials } = initialClient;

      const secureClient = await createTestSecureClient({ credentials });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('falls back to fresh authentication when stored credentials have been revoked', async () => {
      const controlClient = await createTestSecureClient({ nonce: 1997 });
      const secureClient = await createTestSecureClient({ nonce: 1998 });
      const { credentials } = secureClient;
      const revokedKey = credentials.key;

      await expect(fetchApiKeys(controlClient)).resolves.toContain(revokedKey);

      await secureClient.endAuthentication();

      const resumedClient = await createTestSecureClient({ credentials });
      const remainingApiKeys = await fetchApiKeys(controlClient);

      expect(resumedClient.credentials.key).not.toBe(revokedKey);
      expect(remainingApiKeys).toContain(controlClient.credentials.key);
      expect(remainingApiKeys).toContain(resumedClient.credentials.key);
      expect(remainingApiKeys).not.toContain(revokedKey);
    });
  });

  describe('SecureClient.endAuthentication', () => {
    it('returns a public client and invalidates the secure client', async () => {
      const controlClient = await createTestSecureClient({ nonce: 997 });
      const secureClient = await createTestSecureClient({ nonce: 998 });
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
      const secureClient = await createTestSecureClient({ nonce: 999 });
      const handle = await secureClient.subscribe([{ topic: 'user' }]);

      await secureClient.endAuthentication();

      await expect(
        handle[Symbol.asyncIterator]().next(),
      ).resolves.toMatchObject({ done: true });
    });
  });
});
