import { WalletType } from '@polymarket/bindings/gamma';
import { describe, expect, it } from 'vitest';
import {
  createSecureClientWithDepositWallet,
  relayerAuthorization,
} from '../testing';

describe('Transfers', () => {
  describe('prepareErc20Transfer', () => {
    it('submits a self-transfer for the collateral token', async () => {
      const secureClient = await createSecureClientWithDepositWallet({
        apiKey: relayerAuthorization,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const handle = await secureClient.transferErc20({
        amount: 1n,
        recipientAddress: secureClient.account.signer,
        tokenAddress: secureClient.environment.collateralToken,
      });

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
