import { WalletType } from '@polymarket/bindings/gamma';
import { createSecureClient, SigningError } from '@polymarket/client';
import { signerFrom } from '@polymarket/client/viem';
import { ZERO_ADDRESS } from '@polymarket/types';
import { describe, expect, it } from '../fixtures';

describe('Approvals', () => {
  describe('SecureClient.approveErc20', () => {
    it('submits a collateral approval for the standard exchange', async ({
      depositWallet,
      relayerAuthentication,
      walletClient,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: signerFrom(walletClient),
        wallet: depositWallet,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const handle = await secureClient.approveErc20({
        spenderAddress: secureClient.environment.standardExchange,
        tokenAddress: secureClient.environment.collateralToken,
        amount: 'max',
      });

      await expect(handle.wait()).resolves.toBeTruthy();
    });

    it('supports EOA approvals as traditional transactions', async ({
      randomWalletClient,
    }) => {
      const secureClient = await createSecureClient({
        signer: signerFrom(randomWalletClient),
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
    it('submits a Conditional Tokens approval for the standard exchange', async ({
      depositWallet,
      relayerAuthentication,
      walletClient,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: signerFrom(walletClient),
        wallet: depositWallet,
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
    it('submits a combined trading-setup approval workflow', async ({
      depositWallet,
      relayerAuthentication,
      walletClient,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: signerFrom(walletClient),
        wallet: depositWallet,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const handle = await secureClient.setupTradingApprovals();

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
