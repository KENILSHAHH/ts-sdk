import { createSecureClient, WalletType } from '@polymarket/client';
import { fetchApiKeys } from '@polymarket/client/actions';
import { InvariantError, ZERO_ADDRESS } from '@polymarket/types';
import { describe, expect, it, runMeteredTests } from './fixtures';

describe('clients', () => {
  describe('createSecureClient', () => {
    it('authenticates a secure client from an authentication workflow', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates with a non-zero nonce', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        nonce: 1,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates twice with the same nonce', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const firstClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        nonce: 2,
      });

      await expect(fetchApiKeys(firstClient)).resolves.toBeDefined();

      const secondClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        nonce: 2,
      });

      await expect(fetchApiKeys(secondClient)).resolves.toBeDefined();
    });

    it('classifies a deterministic proxy wallet as POLY_PROXY', async ({
      proxyWalletAddress,
      proxyWalletSigner,
    }) => {
      const signerAddress = await proxyWalletSigner.getAddress();
      const secureClient = await createSecureClient({
        signer: proxyWalletSigner,
        wallet: proxyWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);
      expect(secureClient.account.wallet).toBe(proxyWalletAddress);
      expect(secureClient.account.signer).toBe(signerAddress);

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('authenticates as EOA when wallet is omitted', async ({
      depositWalletSigner,
    }) => {
      const signerAddress = await depositWalletSigner.getAddress();
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
      });

      expect(secureClient.account.signer).toBe(signerAddress);
      expect(secureClient.account.wallet).toBe(signerAddress);
      expect(secureClient.account.walletType).toBe(WalletType.EOA);
      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('rejects with InvariantError when wallet does not match signer or any supported derived wallet', async ({
      depositWalletSigner,
    }) => {
      await expect(
        createSecureClient({
          wallet: ZERO_ADDRESS,
          signer: depositWalletSigner,
        }),
      ).rejects.toBeInstanceOf(InvariantError);
    });

    it('reuses stored credentials during authentication when they remain valid', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const initialClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
      });

      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        credentials: initialClient.credentials,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });

    it('falls back to fresh authentication when stored credentials have been revoked', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const controlClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        nonce: 1997,
      });
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        nonce: 1998,
      });
      const { credentials } = secureClient;
      const revokedKey = credentials.key;

      await expect(fetchApiKeys(controlClient)).resolves.toContain(revokedKey);

      await secureClient.endAuthentication();

      const resumedClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
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
    it('returns a secure client for an already-bound Deposit Wallet', async ({
      depositWalletAddress,
      depositWalletSigner,
      relayerAuthentication,
    }) => {
      const signerAddress = await depositWalletSigner.getAddress();
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
      });

      const depositWalletClient = await secureClient.setupGaslessWallet();

      expect(depositWalletClient.account.signer).toBe(signerAddress);
      expect(depositWalletClient.account.wallet).toBe(depositWalletAddress);
      expect(depositWalletClient.account.walletType).toBe(
        WalletType.DEPOSIT_WALLET,
      );
    });

    it('returns a secure client for an already-bound Proxy wallet', async ({
      proxyWalletAddress,
      proxyWalletSigner,
      relayerAuthentication,
    }) => {
      const signerAddress = await proxyWalletSigner.getAddress();
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: proxyWalletSigner,
        wallet: proxyWalletAddress,
      });

      const gaslessClient = await secureClient.setupGaslessWallet();

      expect(gaslessClient.account.signer).toBe(signerAddress);
      expect(gaslessClient.account.wallet).toBe(proxyWalletAddress);
      expect(gaslessClient.account.walletType).toBe(WalletType.POLY_PROXY);
    });

    it.runIf(runMeteredTests)(
      'deploys the Deposit Wallet and returns a secure client bound to it',
      async ({ builderAuthentication, randomEoaSigner }) => {
        const secureClient = await createSecureClient({
          apiKey: builderAuthentication,
          signer: randomEoaSigner,
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
    it('returns a public client and invalidates the secure client', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const controlClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
        nonce: 997,
      });
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
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

    it('closes active subscription iterators before ending authentication', async ({
      depositWalletAddress,
      depositWalletSigner,
    }) => {
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
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
