import { WalletType } from '@polymarket/bindings/gamma';
import { ZERO_ADDRESS } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { SigningError } from '../errors';
// biome-ignore lint/style/noRestrictedImports: intentional
import { createPublicClient } from '../node';
import { createRandomWalletClient, relayerKey, walletClient } from '../testing';
import { approveWith, authenticateWith } from '../viem';
import { prepareErc20Approval } from './approvals';

describe('Approvals', () => {
  describe('prepareErc20Approval', () => {
    it('submits a collateral approval for the standard exchange', async () => {
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
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

    it('fails waiting for a reverted approval from a fresh EOA', async () => {
      const publicClient = createPublicClient();
      const walletClient = createRandomWalletClient();
      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      await expect(
        prepareErc20Approval(secureClient, {
          amount: 'max',
          spenderAddress: ZERO_ADDRESS,
          tokenAddress: secureClient.environment.collateralToken,
        }).then(approveWith(walletClient)),
      ).rejects.toBeInstanceOf(SigningError);
    });
  });
});
