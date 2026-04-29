import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { erc20ApprovalCall } from '../abis';
import { deriveSafeWalletAddress } from '../account';
import { createPublicClient, createSecureClient } from '../clients';
import {
  builderAuthorization,
  createRandomWalletClient,
  createTestSecureClient,
  deriveProxyAddress,
  publicClientWithBuilderKey,
  publicClientWithRelayerKey,
  relayerAuthorization,
  runMeteredTests,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { signerFrom } from '../viem';
import { prepareGaslessTransaction } from './gasless';

describe('Gasless', () => {
  describe('isGaslessReady', () => {
    it('returns true for a deployed safe-backed account', async () => {
      const secureClient = await createTestSecureClient({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      await expect(
        secureClient.isGaslessReady({
          wallet: secureClient.account.wallet,
        }),
      ).resolves.toBe(true);
    });

    it('supports checking readiness from a public client with a wallet address', async () => {
      await expect(
        publicClientWithRelayerKey.isGaslessReady({
          wallet: safeWalletAddress,
        }),
      ).resolves.toBe(true);
    });

    it('returns false for an EOA wallet type', async () => {
      const walletClient = createRandomWalletClient();
      const secureClient = await createSecureClient({
        wallet: walletClient.account.address,
        signer: signerFrom(walletClient),
      });

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      await expect(
        secureClient.isGaslessReady({
          wallet: secureClient.account.wallet,
        }),
      ).resolves.toBe(false);
    });

    it('supports checking readiness from a public client for an EOA wallet', async () => {
      const publicClient = createPublicClient();
      const walletClient = createRandomWalletClient();

      await expect(
        publicClient.isGaslessReady({
          wallet: walletClient.account.address,
        }),
      ).resolves.toBe(false);
    });
  });

  describe('prepareGaslessTransaction', () => {
    it('prepares a single-call workflow without multisend aggregation', async () => {
      const secureClient = await createTestSecureClient({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const call = erc20ApprovalCall(
        secureClient.environment.collateralToken,
        secureClient.environment.standardExchange,
        1n,
      );
      const workflow = await prepareGaslessTransaction(secureClient, {
        calls: [call],
        metadata: 'Single-call gasless transaction',
      });

      const addressRequest = await workflow.next();

      expect(addressRequest).toEqual({
        done: false,
        value: {
          kind: 'requestAddress',
        },
      });

      const signRequest = await workflow.next(secureClient.account.signer);

      expect(signRequest.done).toBe(false);

      if (signRequest.done) {
        return;
      }

      expect(signRequest.value).toEqual({
        kind: 'signGaslessMessage',
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
    });

    it('prepares a multisend workflow when given multiple calls', async () => {
      const secureClient = await createTestSecureClient({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const calls = [
        erc20ApprovalCall(
          secureClient.environment.collateralToken,
          secureClient.environment.standardExchange,
          1n,
        ),
        erc20ApprovalCall(
          secureClient.environment.collateralToken,
          secureClient.environment.negRiskExchange,
          2n,
        ),
      ];
      const workflow = await prepareGaslessTransaction(secureClient, {
        calls,
        metadata: 'Multisend gasless transaction',
      });

      await workflow.next();
      const signRequest = await workflow.next(secureClient.account.signer);

      expect(signRequest.done).toBe(false);

      if (signRequest.done) {
        return;
      }

      expect(signRequest.value).toEqual({
        kind: 'signGaslessMessage',
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
    });
  });

  describe('prepareGaslessTransaction (proxy)', () => {
    it('prepares a proxy workflow yielding a raw hash signing request', async () => {
      const signerAddress = expectEvmAddress(walletClient.account.address);
      const proxyWallet = deriveProxyAddress(signerAddress);

      const secureClient = await createTestSecureClient({
        apiKey: relayerAuthorization,
        wallet: proxyWallet,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);

      const call = erc20ApprovalCall(
        secureClient.environment.collateralToken,
        secureClient.environment.standardExchange,
        1n,
      );
      const workflow = await prepareGaslessTransaction(secureClient, {
        calls: [call],
        metadata: 'Proxy gasless transaction',
      });

      const addressRequest = await workflow.next();

      expect(addressRequest).toEqual({
        done: false,
        value: { kind: 'requestAddress' },
      });

      const signRequest = await workflow.next(secureClient.account.signer);

      expect(signRequest.done).toBe(false);

      if (signRequest.done) {
        return;
      }

      expect(signRequest.value.kind).toBe('signGaslessMessage');
      expect(signRequest.value).toMatchObject({
        kind: 'signGaslessMessage',
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
    });

    it('rejects for EOA wallet type', async () => {
      const eoaClient = createRandomWalletClient();
      const secureClient = await createSecureClient({
        wallet: eoaClient.account.address,
        signer: signerFrom(eoaClient),
      });

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      await expect(
        prepareGaslessTransaction(secureClient, {
          calls: [
            erc20ApprovalCall(
              secureClient.environment.collateralToken,
              secureClient.environment.standardExchange,
              1n,
            ),
          ],
          metadata: 'Should fail',
        }),
      ).rejects.toThrow();
    });
  });

  describe('prepareGaslessWallet', () => {
    it.runIf(runMeteredTests)(
      'deploys a Safe wallet for a new signer',
      async ({ annotate }) => {
        const walletClient = createRandomWalletClient();
        const safeWallet = deriveSafeWalletAddress(
          expectEvmAddress(walletClient.account.address),
          publicClientWithBuilderKey.environment.walletDerivation,
        );

        await expect(
          publicClientWithBuilderKey.isGaslessReady({
            wallet: safeWallet,
          }),
        ).resolves.toBe(false);

        const secureClient = await createSecureClient({
          apiKey: builderAuthorization,
          signer: signerFrom(walletClient),
          wallet: safeWallet,
        });
        const handle = await secureClient.setupGaslessWallet();

        expect(handle.wallet).toBe(safeWallet);

        annotate(`Deployment transaction: ${handle.transactionHash}`);

        await expect(handle.wait()).resolves.toBeTruthy();

        await expect(
          publicClientWithBuilderKey.isGaslessReady({
            wallet: safeWallet,
          }),
        ).resolves.toBe(true);
      },
      20_000,
    );
  });
});
