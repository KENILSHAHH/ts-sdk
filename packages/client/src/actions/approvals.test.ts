import { WalletType } from '@polymarket/bindings/gamma';
import { ZERO_ADDRESS } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { createSecureClient } from '../clients';
import { SigningError } from '../errors';
import {
  createRandomWalletClient,
  createSecureClientWithDepositWallet,
  relayerAuthorization,
} from '../testing';
import { signerFrom } from '../viem';

describe('Approvals', () => {
  describe('SecureClient.approveErc20', () => {
    it('submits a collateral approval for the standard exchange', async () => {
      const secureClient = await createSecureClientWithDepositWallet({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const handle = await secureClient.approveErc20({
        spenderAddress: secureClient.environment.standardExchange,
        tokenAddress: secureClient.environment.collateralToken,
        amount: 'max',
      });

      await expect(handle.wait()).resolves.toBeTruthy();
    });

    it('supports EOA approvals as traditional transactions', async () => {
      const walletClient = createRandomWalletClient();
      const secureClient = await createSecureClient({
        signer: signerFrom(walletClient),
      });

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      // to avoid having to fund the wallet we stop the test by proving the
      // transaction request is correctly formed, without actually sending it
      await expect(
        secureClient.approveErc20({
          amount: 'max',
          spenderAddress: ZERO_ADDRESS,
          tokenAddress: secureClient.environment.collateralToken,
        }),
      ).rejects.toBeInstanceOf(SigningError);
    });
  });

  describe('SecureClient.approveErc1155ForAll', () => {
    it('submits a Conditional Tokens approval for the standard exchange', async () => {
      const secureClient = await createSecureClientWithDepositWallet({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const handle = await secureClient.approveErc1155ForAll({
        operatorAddress: secureClient.environment.standardExchange,
        tokenAddress: secureClient.environment.conditionalTokens,
      });

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });

  describe('SecureClient.setupTradingApprovals', () => {
    it('submits a combined trading-setup approval workflow', async () => {
      const secureClient = await createSecureClientWithDepositWallet({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const handle = await secureClient.setupTradingApprovals();

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
