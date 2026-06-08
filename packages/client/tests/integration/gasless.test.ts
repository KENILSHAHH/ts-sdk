import {
  createSecureClient,
  erc20ApprovalCall,
  type SecureClient,
  type Signer,
  WalletType,
} from '@polymarket/client';
import {
  type GaslessWorkflowRequest,
  prepareGaslessTransaction,
} from '@polymarket/client/actions';
import type { EvmSignature } from '@polymarket/types';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { describe, expect, it } from './fixtures';

const RELAYER_ROOT = 'https://relayer-v2.polymarket.com';
const METADATA = 'Test gasless transaction';

let submitRequests: unknown[] = [];

const server = setupServer(
  http.post(`${RELAYER_ROOT}/submit`, async ({ request }) => {
    submitRequests.push(await request.json());

    return HttpResponse.json({
      state: 'STATE_NEW',
      transactionHash: null,
      transactionID: 'tx-1',
    });
  }),
);

describe('Gasless', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    submitRequests = [];
  });

  afterAll(() => {
    server.close();
  });

  describe('prepareGaslessTransaction submit payloads', () => {
    it('submits a Deposit Wallet WALLET payload', async ({
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

      const { call, handle, signature, signRequest } = await prepareAndSubmit(
        secureClient,
        depositWalletSigner,
      );

      expect(signRequest).toMatchObject({
        kind: 'signGaslessTypedData',
        payload: {
          domain: {
            chainId: secureClient.environment.chainId,
            name: 'DepositWallet',
            verifyingContract: depositWalletAddress,
            version: '1',
          },
          message: {
            calls: [{ data: call.data, target: call.to, value: 0n }],
            wallet: depositWalletAddress,
          },
          primaryType: 'Batch',
        },
      });
      expect(handle.transactionId).toBe('tx-1');
      expect(submitRequests[0]).toMatchObject({
        depositWalletParams: {
          calls: [{ data: call.data, target: call.to, value: '0' }],
          depositWallet: depositWalletAddress,
        },
        from: secureClient.account.signer,
        metadata: METADATA,
        signature,
        to: secureClient.environment.walletDerivation.depositWalletFactory,
        type: 'WALLET',
      });
    });

    it('submits a legacy PROXY payload', async ({
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

      const { signature, signRequest } = await prepareAndSubmit(
        secureClient,
        proxyWalletSigner,
      );

      expect(signRequest).toEqual({
        kind: 'signGaslessMessage',
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
      expect(submitRequests[0]).toMatchObject({
        from: secureClient.account.signer,
        metadata: METADATA,
        proxyWallet: proxyWalletAddress,
        signature,
        to: secureClient.environment.walletDerivation.proxyFactory,
        type: 'PROXY',
      });
    });

    it('submits a legacy SAFE payload', async ({
      safeWalletAddress,
      safeWalletSigner,
      relayerAuthentication,
    }) => {
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: safeWalletSigner,
        wallet: safeWalletAddress,
      });

      expect(secureClient.account.walletType).toBe(WalletType.GNOSIS_SAFE);

      const { call, signature, signRequest } = await prepareAndSubmit(
        secureClient,
        safeWalletSigner,
      );

      expect(signRequest).toEqual({
        kind: 'signGaslessMessage',
        payload: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      });
      expect(submitRequests[0]).toMatchObject({
        data: call.data,
        from: secureClient.account.signer,
        metadata: METADATA,
        proxyWallet: safeWalletAddress,
        signature: packSafeSignature(signature),
        to: call.to,
        type: 'SAFE',
      });
    });
  });
});

async function prepareAndSubmit(client: SecureClient, signer: Signer) {
  const call = erc20ApprovalCall(
    client.environment.collateralToken,
    client.environment.standardExchange,
    1n,
  );
  const workflow = await prepareGaslessTransaction(client, {
    calls: [call],
    metadata: METADATA,
  });

  await expect(workflow.next()).resolves.toEqual({
    done: false,
    value: { kind: 'requestAddress' },
  });

  const signRequest = await workflow.next(client.account.signer);

  expect(signRequest.done).toBe(false);

  if (signRequest.done) {
    throw new Error('Expected a signing request');
  }

  const signature = await signWorkflowRequest(signer, signRequest.value);
  const result = await workflow.next(signature);

  expect(result.done).toBe(true);

  if (!result.done) {
    throw new Error('Expected a transaction handle');
  }

  return {
    call,
    handle: result.value,
    signature,
    signRequest: signRequest.value,
  };
}

async function signWorkflowRequest(
  signer: Signer,
  request: GaslessWorkflowRequest,
): Promise<EvmSignature> {
  if (request.kind === 'signGaslessTypedData') {
    return signer.signTypedData(request.payload);
  }

  if (request.kind === 'signGaslessMessage') {
    return signer.signMessage(request.payload);
  }

  throw new Error('Expected a signing request');
}

function packSafeSignature(signature: EvmSignature): EvmSignature {
  const v = Number.parseInt(signature.slice(-2), 16);
  const packedV =
    v === 0 || v === 1 ? v + 31 : v === 27 || v === 28 ? v + 4 : v;

  return `${signature.slice(0, -2)}${packedV.toString(16).padStart(2, '0')}` as EvmSignature;
}
