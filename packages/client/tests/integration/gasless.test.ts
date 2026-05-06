import {
  createSecureClient,
  erc20ApprovalCall,
  WalletType,
} from '@polymarket/client';
import { prepareGaslessTransaction } from '@polymarket/client/actions';
import { describe, expect, it } from './fixtures';

describe('Gasless', () => {
  describe('isGaslessReady', () => {
    it('returns true for an already deployed Deposit Wallet', async ({
      safeWalletAddress,
      safeWalletSigner,
    }) => {
      const secureClient = await createSecureClient({
        signer: safeWalletSigner,
        wallet: safeWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.GNOSIS_SAFE);

      await expect(secureClient.isGaslessReady()).resolves.toBe(true);
    });

    it('returns false for an EOA wallet type', async ({ randomEoaSigner }) => {
      const secureClient = await createSecureClient({
        signer: randomEoaSigner,
      });

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      await expect(secureClient.isGaslessReady()).resolves.toBe(false);
    });
  });

  describe('prepareGaslessTransaction', () => {
    it('prepares a Deposit Wallet workflow yielding a batch typed-data signing request', async ({
      depositWalletAddress,
      depositWalletSigner,
      relayerAuthentication,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

      const call = erc20ApprovalCall(
        secureClient.environment.collateralToken,
        secureClient.environment.standardExchange,
        1n,
      );
      const workflow = await prepareGaslessTransaction(secureClient, {
        calls: [call],
        metadata: 'Deposit Wallet gasless transaction',
      });

      const addressRequest = await workflow.next();

      expect(addressRequest).toEqual({
        done: false,
        value: { kind: 'requestAddress' },
      });

      const signRequest = await workflow.next(secureClient.account.signer);

      expect(signRequest.done).toBe(false);

      if (signRequest.done) {
        return;
      }

      expect(signRequest.value).toMatchObject({
        kind: 'signGaslessTypedData',
        payload: {
          domain: {
            chainId: secureClient.environment.chainId,
            name: 'DepositWallet',
            verifyingContract: depositWalletAddress,
            version: '1',
          },
          message: {
            calls: [
              {
                data: call.data,
                target: call.to,
                value: 0n,
              },
            ],
            wallet: depositWalletAddress,
          },
          primaryType: 'Batch',
          types: {
            Batch: expect.any(Array),
            Call: expect.any(Array),
          },
        },
      });

      if (signRequest.value.kind !== 'signGaslessTypedData') {
        return;
      }

      expect(typeof signRequest.value.payload.message.nonce).toBe('bigint');
      expect(typeof signRequest.value.payload.message.deadline).toBe('bigint');
    });

    it('prepares a single-call workflow without multisend aggregation', async ({
      relayerAuthentication,
      safeWalletAddress,
      safeWalletSigner,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: safeWalletSigner,
        wallet: safeWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.GNOSIS_SAFE);

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
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
    });

    it('prepares a multisend workflow when given multiple calls', async ({
      relayerAuthentication,
      safeWalletAddress,
      safeWalletSigner,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: safeWalletSigner,
        wallet: safeWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.GNOSIS_SAFE);

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
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
    });
  });

  describe('prepareGaslessTransaction (proxy)', () => {
    it('prepares a proxy workflow yielding a raw hash signing request', async ({
      proxyWalletAddress,
      proxyWalletSigner,
      relayerAuthentication,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: proxyWalletSigner,
        wallet: proxyWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.POLY_PROXY);

      const call = erc20ApprovalCall(
        secureClient.environment.collateralToken,
        secureClient.environment.standardExchange,
        1n,
      );
      const workflow = await prepareGaslessTransaction(secureClient, {
        calls: [call],
        metadata: 'Proxy gasless transaction',
      });

      const addressRequest = await workflow.next();

      expect(addressRequest).toEqual({
        done: false,
        value: { kind: 'requestAddress' },
      });

      const signRequest = await workflow.next(secureClient.account.signer);

      expect(signRequest.done).toBe(false);

      if (signRequest.done) {
        return;
      }

      expect(signRequest.value.kind).toBe('signGaslessMessage');
      expect(signRequest.value).toMatchObject({
        kind: 'signGaslessMessage',
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
    });

    it('rejects for EOA wallet type', async ({ randomEoaSigner }) => {
      const secureClient = await createSecureClient({
        signer: randomEoaSigner,
      });

      expect(secureClient.account.walletType).toBe(WalletType.EOA);

      await expect(
        prepareGaslessTransaction(secureClient, {
          calls: [
            erc20ApprovalCall(
              secureClient.environment.collateralToken,
              secureClient.environment.standardExchange,
              1n,
            ),
          ],
          metadata: 'Should fail',
        }),
      ).rejects.toThrow();
    });
  });
});
