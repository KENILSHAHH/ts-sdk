import { ApiKeySchema } from '@polymarket/bindings';
import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import {
  type EvmAddress,
  expectEvmAddress,
  expectEvmSignature,
} from '@polymarket/types';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createSecureClient } from './clients';
import { production } from './environments';
import type { ApiKeyAuthorization, Signer } from './types';
import {
  deriveBeaconDepositWalletAddress,
  deriveProxyWalletAddress,
  deriveSafeWalletAddress,
  deriveUupsDepositWalletAddress,
} from './wallet';

const rpcRoot = 'http://localhost:4014';
const relayerRoot = 'http://localhost:4015';
const clobRoot = 'http://localhost:4016';
const server = setupServer();
const signerAddress = expectEvmAddress(
  '0x0000000000000000000000000000000000000001',
);

const environment = {
  ...production,
  clob: clobRoot,
  relayer: relayerRoot,
  rpc: rpcRoot,
};

const credentials: ApiKeyCreds = {
  key: ApiKeySchema.parse('key'),
  passphrase: 'passphrase',
  secret: 'secret',
};

const apiKey: ApiKeyAuthorization = {
  get isBuilderKey() {
    return false;
  },
  get supportGasless() {
    return true;
  },
  authorize() {
    return Promise.resolve({ RELAYER_API_KEY: 'key' });
  },
};

const signer: Signer = {
  getAddress() {
    return Promise.resolve(signerAddress);
  },
  signMessage() {
    throw new Error('Unexpected signMessage call');
  },
  signTypedData() {
    throw new Error('Unexpected signTypedData call');
  },
  sendTransaction() {
    throw new Error('Unexpected sendTransaction call');
  },
};

describe('secure client gasless wallet setup', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('deploys the default deposit wallet when it is not yet deployed', async () => {
    const expectedWallet = deriveBeaconDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    mockBeaconFactory();
    mockUndeployedWallet(expectedWallet);
    const submit = mockDeployDepositWallet();

    const client = await createSecureClient({
      apiKey,
      credentials,
      environment,
      signer,
    });

    expect(submit.called).toBe(true);
    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: expectedWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
  });

  it('defaults createSecureClient without a wallet to the deterministic deposit wallet', async () => {
    const expectedWallet = deriveBeaconDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    mockBeaconFactory();
    mockDeployedWallet(expectedWallet);

    const client = await createSecureClient({
      apiKey,
      credentials,
      environment,
      signer,
    });

    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: expectedWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
  });

  it('verifies an explicit deposit wallet before returning the secure client', async () => {
    const expectedWallet = deriveBeaconDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    const deployedWallet = mockDeployedWallet(expectedWallet);

    const client = await createSecureClient({
      apiKey,
      credentials,
      environment,
      signer,
      wallet: expectedWallet,
    });

    expect(deployedWallet.called).toBe(true);
    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: expectedWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
  });

  it('keeps an explicit EOA wallet bound to the EOA', async () => {
    mockApiKeys();

    const client = await createSecureClient({
      apiKey,
      credentials,
      environment,
      signer,
      wallet: signerAddress,
    });

    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: signerAddress,
      walletType: WalletType.EOA,
    });
  });

  it('accepts an explicit zero nonce for fresh authentication', async () => {
    const signingSigner: Signer = {
      ...signer,
      signTypedData(payload) {
        expect(payload.message.nonce).toBe(0);
        return Promise.resolve(expectEvmSignature(`0x${'1'.repeat(130)}`));
      },
    };

    server.use(
      http.post(`${clobRoot}/auth/api-key`, ({ request }) => {
        expect(request.headers.get('POLY_NONCE')).toBe('0');

        return HttpResponse.json({
          apiKey: credentials.key,
          passphrase: credentials.passphrase,
          secret: credentials.secret,
        });
      }),
    );

    const client = await createSecureClient({
      environment,
      nonce: 0,
      signer: signingSigner,
      wallet: signerAddress,
    });

    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: signerAddress,
      walletType: WalletType.EOA,
    });
  });

  it('keeps an explicit deployed Safe wallet bound to the Safe', async () => {
    const safeWallet = deriveSafeWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    mockAccountWalletDeployed(safeWallet, true);

    const client = await createSecureClient({
      apiKey,
      credentials,
      environment,
      signer,
      wallet: safeWallet,
    });

    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: safeWallet,
      walletType: WalletType.GNOSIS_SAFE,
    });
  });

  it('keeps an explicit deployed proxy wallet bound to the proxy', async () => {
    const proxyWallet = deriveProxyWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    mockAccountWalletDeployed(proxyWallet, true);

    const client = await createSecureClient({
      apiKey,
      credentials,
      environment,
      signer,
      wallet: proxyWallet,
    });

    expect(client.account).toEqual({
      signer: signerAddress,
      wallet: proxyWallet,
      walletType: WalletType.POLY_PROXY,
    });
  });

  it('rejects an explicit Safe wallet with no deployed code', async () => {
    const safeWallet = deriveSafeWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    mockAccountWalletDeployed(safeWallet, false);

    await expect(
      createSecureClient({
        apiKey,
        credentials,
        environment,
        signer,
        wallet: safeWallet,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('does not exist'),
      name: 'UserInputError',
    });
  });

  it('rejects an explicit undeployed deposit wallet that is not the current one', async () => {
    const currentWallet = deriveBeaconDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    const legacyWallet = deriveUupsDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockApiKeys();
    mockBeaconFactory();
    mockUndeployedWallet(legacyWallet);

    await expect(
      createSecureClient({
        apiKey,
        credentials,
        environment,
        signer,
        wallet: legacyWallet,
      }),
    ).rejects.toMatchObject({
      message: `Wallet ${legacyWallet} does not match the expected Deposit Wallet ${currentWallet} for this signer, nor a deployed wallet address.`,
      name: 'UserInputError',
    });
  });

  it('does not silently fall back when default deposit wallet detection fails generically', async () => {
    mockFactoryRpcError();

    await expect(
      createSecureClient({
        apiKey,
        credentials,
        environment,
        signer,
      }),
    ).rejects.toMatchObject({
      message: 'JSON-RPC eth_call failed: upstream unavailable',
      name: 'RequestRejectedError',
    });
  });
});

function mockBeaconFactory() {
  server.use(
    http.post(rpcRoot, () =>
      HttpResponse.json({
        jsonrpc: '2.0',
        id: 1,
        result: `0x000000000000000000000000${environment.walletDerivation.depositWalletBeacon.slice(2)}`,
      }),
    ),
  );
}

function mockFactoryRpcError() {
  server.use(
    http.post(rpcRoot, () =>
      HttpResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32_603, message: 'upstream unavailable' },
      }),
    ),
  );
}

function mockApiKeys() {
  server.use(
    http.get(`${clobRoot}/auth/api-keys`, () =>
      HttpResponse.json({ apiKeys: [credentials.key] }),
    ),
  );
}

function mockAccountWalletDeployed(wallet: EvmAddress, deployed: boolean) {
  server.use(
    http.get(`${relayerRoot}/deployed`, ({ request }) => {
      const url = new URL(request.url);

      expect(url.searchParams.get('address')).toBe(wallet);

      return HttpResponse.json({ deployed });
    }),
  );
}

function mockUndeployedWallet(expectedWallet: EvmAddress) {
  server.use(
    http.get(`${relayerRoot}/deployed`, ({ request }) => {
      const url = new URL(request.url);

      expect(url.searchParams.get('address')).toBe(expectedWallet);
      expect(url.searchParams.get('type')).toBe('WALLET');

      return HttpResponse.json({ deployed: false });
    }),
  );
}

function mockDeployDepositWallet() {
  const state = { called: false };
  const transactionId = '00000000-0000-0000-0000-000000000001';
  const transactionHash = `0x${'1'.repeat(64)}`;

  server.use(
    http.post(`${relayerRoot}/submit`, () => {
      state.called = true;

      return HttpResponse.json({
        state: 'STATE_MINED',
        transactionHash,
        transactionID: transactionId,
      });
    }),
    http.get(`${relayerRoot}/v1/account/transactions/${transactionId}`, () =>
      HttpResponse.json({
        state: 'STATE_MINED',
        transaction_hash: transactionHash,
        transaction_id: transactionId,
      }),
    ),
  );

  return state;
}

function mockDeployedWallet(expectedWallet: EvmAddress) {
  const state = { called: false };

  server.use(
    http.get(`${relayerRoot}/deployed`, ({ request }) => {
      state.called = true;
      const url = new URL(request.url);

      expect(url.searchParams.get('address')).toBe(expectedWallet);
      expect(url.searchParams.get('type')).toBe('WALLET');

      return HttpResponse.json({ deployed: true });
    }),
  );

  return state;
}
