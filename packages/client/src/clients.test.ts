import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress, InvariantError } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import { createSecureClient } from './clients';
import {
  builderAuthorization,
  createRandomWalletClient,
  createSecureClientWithSafeWallet,
  deriveProxyAddress,
  relayerAuthorization,
  runMeteredTests,
  safeWalletAddress,
  walletClient,
} from './testing';
import { signerFrom } from './viem';

describe('clients', () => {
  describe('createSecureClient', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates with a non-zero nonce', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        nonce: 1,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates twice with the same nonce', async () => {
      const firstClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        nonce: 2,
      });

      await expect(fetchApiKeys(firstClient)).resolves.toBeDefined();

      const secondClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        nonce: 2,
      });

      await expect(fetchApiKeys(secondClient)).resolves.toBeDefined();
    });

    it('classifies a deterministic proxy wallet as POLY_PROXY', async () => {
      const signerAddress = expectEvmAddress(walletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);

      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: proxyWallet,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);
      expect(secureClient.account.wallet).toBe(proxyWallet);
      expect(secureClient.account.signer).toBe(signerAddress);

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates as EOA when wallet is omitted', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
      });

      expect(secureClient.account.signer).toBe(walletClient.account.address);
      expect(secureClient.account.wallet).toBe(walletClient.account.address);
      expect(secureClient.account.walletType).toBe(WalletType.EOA);
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
      const initialClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
      });

      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        credentials: initialClient.credentials,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('falls back to fresh authentication when stored credentials have been revoked', async () => {
      const controlClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        nonce: 1997,
      });
      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        nonce: 1998,
      });
      const { credentials } = secureClient;
      const revokedKey = credentials.key;

      await expect(fetchApiKeys(controlClient)).resolves.toContain(revokedKey);

      await secureClient.endAuthentication();

      const resumedClient = await createSecureClient({
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
        credentials,
      });
      const remainingApiKeys = await fetchApiKeys(controlClient);

      expect(resumedClient.credentials.key).not.toBe(revokedKey);
      expect(remainingApiKeys).toContain(controlClient.credentials.key);
      expect(remainingApiKeys).toContain(resumedClient.credentials.key);
      expect(remainingApiKeys).not.toContain(revokedKey);
    });
  });

  describe('SecureClient.setupGaslessWallet', () => {
    it('returns a secure client for an already deployed Safe wallet', async () => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthorization,
        signer: signerFrom(walletClient),
        wallet: safeWalletAddress,
      });
      await expect(secureClient.isGaslessReady()).resolves.toBe(true);

      const gaslessClient = await secureClient.setupGaslessWallet();

      expect(gaslessClient.account.walletType).toBe(
        WalletType.POLY_GNOSIS_SAFE,
      );
    });

    it('returns a secure client bound to the same Proxy wallet', async () => {
      const signerAddress = expectEvmAddress(walletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);
      const secureClient = await createSecureClient({
        apiKey: relayerAuthorization,
        signer: signerFrom(walletClient),
        wallet: proxyWallet,
      });

      const gaslessClient = await secureClient.setupGaslessWallet();

      expect(gaslessClient.account.signer).toBe(signerAddress);
      expect(gaslessClient.account.wallet).toBe(proxyWallet);
      expect(gaslessClient.account.walletType).toBe(WalletType.POLY_PROXY);
    });

    it.runIf(runMeteredTests)(
      'deploys the signer Safe and returns a secure client bound to it',
      async () => {
        const walletClient = createRandomWalletClient();

        const secureClient = await createSecureClient({
          apiKey: builderAuthorization,
          signer: signerFrom(walletClient),
        });

        await expect(secureClient.isGaslessReady()).resolves.toBe(false);

        const gaslessClient = await secureClient.setupGaslessWallet();

        await expect(gaslessClient.isGaslessReady()).resolves.toBe(true);
      },
      20_000,
    );
  });

  describe('SecureClient.endAuthentication', () => {
    it('returns a public client and invalidates the secure client', async () => {
      const controlClient = await createSecureClientWithSafeWallet({
        nonce: 997,
      });
      const secureClient = await createSecureClientWithSafeWallet({
        nonce: 998,
      });
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
      const secureClient = await createSecureClientWithSafeWallet({
        nonce: 999,
      });
      const handle = await secureClient.subscribe([{ topic: 'user' }]);

      await secureClient.endAuthentication();

      await expect(
        handle[Symbol.asyncIterator]().next(),
      ).resolves.toMatchObject({ done: true });
    });
  });
});
