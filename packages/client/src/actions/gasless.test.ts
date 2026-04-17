import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { erc20ApprovalCall } from '../abis';
import { deriveSafeWalletAddress } from '../account';
import { createPublicClient } from '../clients';
import {
  createRandomWalletClient,
  publicClientWithBuilderKey,
  publicClientWithRelayerKey,
  runMeteredTests,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { authenticateWith, completeWith } from '../viem';
import {
  isGaslessReady,
  prepareGaslessTransaction,
  prepareGaslessWallet,
} from './gasless';

describe('Gasless', () => {
  describe('isGaslessReady', () => {
    it('returns true for a deployed safe-backed account', async () => {
      const secureClient = await publicClientWithRelayerKey
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      await expect(
        isGaslessReady(secureClient, {
          wallet: secureClient.account.wallet,
        }),
      ).resolves.toBe(true);
    });

    it('supports checking readiness from a public client with a wallet address', async () => {
      await expect(
        isGaslessReady(publicClientWithRelayerKey, {
          wallet: safeWalletAddress,
        }),
      ).resolves.toBe(true);
    });

    it('returns false for an EOA wallet type', async () => {
      const publicClient = createPublicClient();
      const walletClient = createRandomWalletClient();
      const secureClient = await publicClient
        .beginAuthentication({ wallet: walletClient.account.address })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      await expect(
        isGaslessReady(secureClient, {
          wallet: secureClient.account.wallet,
        }),
      ).resolves.toBe(false);
    });

    it('supports checking readiness from a public client for an EOA wallet', async () => {
      const publicClient = createPublicClient();
      const walletClient = createRandomWalletClient();

      await expect(
        isGaslessReady(publicClient, {
          wallet: walletClient.account.address,
        }),
      ).resolves.toBe(false);
    });
  });

  describe('prepareGaslessTransaction', () => {
    it('prepares a single-call workflow without multisend aggregation', async () => {
      const secureClient = await publicClientWithRelayerKey
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

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
        payload: expect.objectContaining({
          domain: expect.objectContaining({
            chainId: secureClient.environment.chainId,
            verifyingContract: secureClient.account.wallet,
          }),
          message: expect.objectContaining({
            data: call.data,
            operation: 0,
            to: call.to,
            value: 0n,
          }),
          primaryType: 'SafeTx',
        }),
      });
    });

    it('prepares a multisend workflow when given multiple calls', async () => {
      const secureClient = await publicClientWithRelayerKey
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

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
        payload: expect.objectContaining({
          message: expect.objectContaining({
            data: expect.stringMatching(/^0x8d80ff0a/),
            operation: 1,
            to: secureClient.environment.safeMultisend,
            value: 0n,
          }),
        }),
      });
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
          isGaslessReady(publicClientWithBuilderKey, {
            wallet: safeWallet,
          }),
        ).resolves.toBe(false);

        const handle = await prepareGaslessWallet(
          publicClientWithBuilderKey,
        ).then(completeWith(walletClient));

        expect(handle.wallet).toBe(safeWallet);

        annotate(`Deployment transaction: ${handle.transactionHash}`);

        await expect(handle.wait()).resolves.toBeTruthy();

        await expect(
          isGaslessReady(publicClientWithBuilderKey, {
            wallet: safeWallet,
          }),
        ).resolves.toBe(true);
      },
    );
  });
});
