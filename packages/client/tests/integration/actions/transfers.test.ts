import { WalletType } from '@polymarket/bindings/gamma';
import { createSecureClient } from '@polymarket/client';
import { signerFrom } from '@polymarket/client/viem';
import { describe, expect, it } from '../fixtures';

describe('Transfers', () => {
  describe('SecureClient.transferErc20', () => {
    it('submits a self-transfer for the collateral token', async ({
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

      const handle = await secureClient.transferErc20({
        amount: 1n,
        recipientAddress: secureClient.account.signer,
        tokenAddress: secureClient.environment.collateralToken,
      });

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
