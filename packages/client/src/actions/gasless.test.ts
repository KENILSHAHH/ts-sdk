import { WalletType } from '@polymarket/bindings/gamma';
import { describe, expect, it } from 'vitest';
import { erc20ApprovalCall } from '../abis';
import { createPublicClient } from '../clients';
import { relayerKey, walletClient } from '../testing';
import { authenticateWith } from '../viem';
import { prepareGaslessTransaction } from './gasless';

describe('Gasless', () => {
  describe('prepareGaslessTransaction', () => {
    it('prepares a single-call workflow without multisend aggregation', async () => {
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(walletClient));

      expect(secureClient.account.walletType).toBe(WalletType.POLY_GNOSIS_SAFE);

      const call = erc20ApprovalCall(
        secureClient.environment.collateralToken,
        secureClient.environment.standardExchange,
        1n,
      );
      const workflow = await prepareGaslessTransaction(secureClient, {
        calls: [call],
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
        kind: 'signGaslessTypedDataAsMessage',
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
      const publicClient = createPublicClient({
        apiKey: relayerKey,
      });
      const secureClient = await publicClient
        .beginAuthentication()
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
      });

      await workflow.next();
      const signRequest = await workflow.next(secureClient.account.signer);

      expect(signRequest.done).toBe(false);

      if (signRequest.done) {
        return;
      }

      expect(signRequest.value).toEqual({
        kind: 'signGaslessTypedDataAsMessage',
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
});
