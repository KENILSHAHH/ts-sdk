import { ApiKeySchema } from '@polymarket/bindings';
import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import { type EvmAddress, expectEvmAddress } from '@polymarket/types';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BaseSecureClient } from './clients';
import { walletActions } from './decorators/wallet';
import { production } from './environments';
import type { ApiKeyAuthorization, Signer } from './types';
import {
  deriveBeaconDepositWalletAddress,
  deriveUupsDepositWalletAddress,
  resolveAccountIdentity,
} from './wallet';

const rpcRoot = 'http://localhost:4014';
const relayerRoot = 'http://localhost:4015';
const server = setupServer();
const signerAddress = expectEvmAddress(
  '0x0000000000000000000000000000000000000001',
);

const environment = {
  ...production,
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

  it('uses the beacon deposit wallet when the factory exposes BEACON', async () => {
    const expectedWallet = deriveBeaconDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockBeaconFactory();
    mockDeployedWallet(expectedWallet);
    const client = createEoaClient();

    const gaslessClient = await client.setupGaslessWallet();

    expect(gaslessClient.account).toEqual({
      signer: signerAddress,
      wallet: expectedWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
  });

  it('uses the UUPS deposit wallet when the factory BEACON call reverts', async () => {
    const expectedWallet = deriveUupsDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockLegacyFactory();
    mockDeployedWallet(expectedWallet);
    const client = createEoaClient();

    const gaslessClient = await client.setupGaslessWallet();

    expect(gaslessClient.account).toEqual({
      signer: signerAddress,
      wallet: expectedWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
  });

  it('checks the current deterministic deposit wallet for EOA gasless readiness', async () => {
    const expectedWallet = deriveBeaconDepositWalletAddress(
      signerAddress,
      environment.walletDerivation,
    );
    mockBeaconFactory();
    mockDeployedWallet(expectedWallet);
    const client = createEoaClient();

    await expect(walletActions(client).isGaslessReady()).resolves.toBe(true);
  });

  it('does not silently fall back when factory detection fails generically', async () => {
    mockFactoryRpcError();
    const client = createEoaClient();

    await expect(client.setupGaslessWallet()).rejects.toMatchObject({
      message: 'JSON-RPC eth_call failed: upstream unavailable',
      name: 'RequestRejectedError',
    });
  });
});

function createEoaClient() {
  return new BaseSecureClient({
    account: resolveAccountIdentity(environment, signerAddress, signerAddress),
    apiKey,
    credentials,
    environment,
    signer,
  });
}

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

function mockLegacyFactory() {
  server.use(
    http.post(rpcRoot, () =>
      HttpResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: { code: 3, message: 'execution reverted' },
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

function mockDeployedWallet(expectedWallet: EvmAddress) {
  server.use(
    http.get(`${relayerRoot}/deployed`, ({ request }) => {
      const url = new URL(request.url);

      expect(url.searchParams.get('address')).toBe(expectedWallet);
      expect(url.searchParams.get('type')).toBe('WALLET');

      return HttpResponse.json({ deployed: true });
    }),
  );
}
