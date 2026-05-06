import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress, InvariantError } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { fetchApiKeys } from './actions';
import { createSecureClient } from './clients';
import {
  builderAuthorization,
  createRandomWalletClient,
  createSecureClientWithSafeWallet,
  depositWallet,
  deriveDepositWallet,
  deriveProxyAddress,
  relayerAuthorization,
  runMeteredTests,
  safeWalletClient,
} from './testing';
import { signerFrom } from './viem';

describe('clients', () => {
  describe('createSecureClient', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates with a non-zero nonce', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
        nonce: 1,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates twice with the same nonce', async () => {
      const firstClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
        nonce: 2,
      });

      await expect(fetchApiKeys(firstClient)).resolves.toBeDefined();

      const secondClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
        nonce: 2,
      });

      await expect(fetchApiKeys(secondClient)).resolves.toBeDefined();
    });

    it('classifies a deterministic proxy wallet as POLY_PROXY', async () => {
      const signerAddress = expectEvmAddress(safeWalletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);

      const secureClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: proxyWallet,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);
      expect(secureClient.account.wallet).toBe(proxyWallet);
      expect(secureClient.account.signer).toBe(signerAddress);

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates as EOA when wallet is omitted', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
      });

      expect(secureClient.account.signer).toBe(
        safeWalletClient.account.address,
      );
      expect(secureClient.account.wallet).toBe(
        safeWalletClient.account.address,
      );
      expect(secureClient.account.walletType).toBe(WalletType.EOA);
      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('rejects with InvariantError when wallet does not match signer or any supported derived wallet', async () => {
      const unrelatedWallet = createRandomWalletClient();

      await expect(
        createSecureClient({
          wallet: unrelatedWallet.account.address,
          signer: signerFrom(safeWalletClient),
        }),
      ).rejects.toBeInstanceOf(InvariantError);
    });

    it('reuses stored credentials during authentication when they remain valid', async () => {
      const initialClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
      });

      const secureClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
        credentials: initialClient.credentials,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('falls back to fresh authentication when stored credentials have been revoked', async () => {
      const controlClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
        nonce: 1997,
      });
      const secureClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
        nonce: 1998,
      });
      const { credentials } = secureClient;
      const revokedKey = credentials.key;

      await expect(fetchApiKeys(controlClient)).resolves.toContain(revokedKey);

      await secureClient.endAuthentication();

      const resumedClient = await createSecureClient({
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
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
    it('returns a secure client for an already-bound Deposit Wallet', async () => {
      const signerAddress = expectEvmAddress(safeWalletClient.account.address);
      const depositWallet = deriveDepositWallet(signerAddress);
      const secureClient = await createSecureClient({
        apiKey: relayerAuthorization,
        signer: signerFrom(safeWalletClient),
        wallet: depositWallet,
      });

      const depositWalletClient = await secureClient.setupGaslessWallet();

      expect(depositWalletClient.account.signer).toBe(signerAddress);
      expect(depositWalletClient.account.wallet).toBe(depositWallet);
      expect(depositWalletClient.account.walletType).toBe(
        WalletType.DEPOSIT_WALLET,
      );
    });

    it('returns a secure client for an already-bound Proxy wallet', async () => {
      const signerAddress = expectEvmAddress(safeWalletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);
      const secureClient = await createSecureClient({
        apiKey: relayerAuthorization,
        signer: signerFrom(safeWalletClient),
        wallet: proxyWallet,
      });

      const gaslessClient = await secureClient.setupGaslessWallet();

      expect(gaslessClient.account.signer).toBe(signerAddress);
      expect(gaslessClient.account.wallet).toBe(proxyWallet);
      expect(gaslessClient.account.walletType).toBe(WalletType.POLY_PROXY);
    });

    it.runIf(runMeteredTests)(
      'deploys the Deposit Wallet and returns a secure client bound to it',
      async () => {
        const walletClient = createRandomWalletClient();

        const secureClient = await createSecureClient({
          apiKey: builderAuthorization,
          signer: signerFrom(walletClient),
        });

        await expect(secureClient.isGaslessReady()).resolves.toBe(false);

        const depositWalletClient = await secureClient.setupGaslessWallet();

        expect(depositWalletClient.account.walletType).toBe(
          WalletType.DEPOSIT_WALLET,
        );
        await expect(depositWalletClient.isGaslessReady()).resolves.toBe(true);
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
