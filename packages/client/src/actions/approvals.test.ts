import { WalletType } from '@polymarket/bindings/gamma';
import { ZERO_ADDRESS } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { createPublicClient } from '../clients';
import { SigningError } from '../errors';
import {
  createRandomWalletClient,
  relayerKey,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { authenticateWith, completeWith } from '../viem';
import {
  prepareErc20Approval,
  prepareErc1155ApprovalForAll,
  prepareTradingApprovals,
} from './approvals';

describe('Approvals', () => {
  describe('prepareErc20Approval', () => {
    it('submits a collateral approval for the standard exchange', async () => {
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const handle = await prepareErc20Approval(secureClient, {
        spenderAddress: secureClient.environment.standardExchange,
        tokenAddress: secureClient.environment.collateralToken,
        amount: 'max',
      }).then(completeWith(walletClient));

      await expect(handle.wait()).resolves.toBeTruthy();
    });

    it('supports EOA approvals as traditional transactions', async () => {
      const publicClient = createPublicClient();
      const walletClient = createRandomWalletClient();
      const secureClient = await publicClient
        .beginAuthentication({ wallet: walletClient.account.address })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      // to avoid having to fund the wallet we stop the test by proving the
      // transaction request is correctly formed, without actually sending it
      await expect(
        prepareErc20Approval(secureClient, {
          amount: 'max',
          spenderAddress: ZERO_ADDRESS,
          tokenAddress: secureClient.environment.collateralToken,
        }).then(completeWith(walletClient)),
      ).rejects.toBeInstanceOf(SigningError);
    });
  });

  describe('prepareErc1155ApprovalForAll', () => {
    it('submits a Conditional Tokens approval for the standard exchange', async () => {
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const handle = await prepareErc1155ApprovalForAll(secureClient, {
        operatorAddress: secureClient.environment.standardExchange,
        tokenAddress: secureClient.environment.conditionalTokens,
      }).then(completeWith(walletClient));

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });

  describe('prepareTradingApprovals', () => {
    it('submits a combined trading-setup approval workflow', async () => {
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const handle = await prepareTradingApprovals(secureClient).then(
        completeWith(walletClient),
      );

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
