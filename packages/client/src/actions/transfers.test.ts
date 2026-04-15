import { WalletType } from '@polymarket/bindings/gamma';
import { describe, expect, it } from 'vitest';
import { createPublicClient } from '../clients';
import { relayerKey, safeWalletAddress, walletClient } from '../testing';
import { authenticateWith, completeWith } from '../viem';
import { prepareErc20Transfer } from './transfers';

describe('Transfers', () => {
  describe('prepareErc20Transfer', () => {
    it('submits a self-transfer for the collateral token', async () => {
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const handle = await prepareErc20Transfer(secureClient, {
        amount: 1n,
        recipientAddress: secureClient.account.signer,
        tokenAddress: secureClient.environment.collateralToken,
      }).then(completeWith(walletClient));

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
