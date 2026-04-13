import { WalletType } from '@polymarket/bindings/gamma';
import { describe, expect, it } from 'vitest';
// biome-ignore lint/style/noRestrictedImports: intentional
import { createPublicClient } from '../node';
import { builderCredentials, createTestWalletClient } from '../testing';
import { approveWith, authenticateWith } from '../viem';
import { prepareErc20Approval } from './approvals';

describe('Approvals', () => {
  describe('prepareErc20Approval', () => {
    it('submits a collateral approval for the standard exchange', async () => {
      const publicClient = createPublicClient({
        apiKey: builderCredentials,
      });
      const walletClient = createTestWalletClient();
      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));
      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const handle = await prepareErc20Approval(secureClient, {
        spenderAddress: secureClient.environment.standardExchange,
        tokenAddress: secureClient.environment.collateralToken,
        amount: 'max',
      }).then(approveWith(walletClient));

      await expect(handle.wait()).resolves.toBeTruthy();
    });
  });
});
