import { SignatureType } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress, ZERO_ADDRESS } from '@polymarket/types';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { production } from './environments';
import { JsonRpcClient } from './rpc';
import {
  deriveBeaconDepositWalletAddress,
  deriveProxyWalletAddress,
  deriveSafeWalletAddress,
  deriveUupsDepositWalletAddress,
  getDepositWalletFactoryBeacon,
  isBeaconDepositWalletFactory,
  resolveAccountIdentity,
  toSignatureType,
} from './wallet';

const root = 'http://localhost:4013';
const server = setupServer();

describe('Wallet', () => {
  const signer = expectEvmAddress('0x0000000000000000000000000000000000000001');

  it('maps wallet types to order signature types', () => {
    expect(toSignatureType(WalletType.EOA)).toBe(SignatureType.EOA);
    expect(toSignatureType(WalletType.DEPOSIT_WALLET)).toBe(
      SignatureType.POLY_1271,
    );
    expect(toSignatureType(WalletType.POLY_PROXY)).toBe(
      SignatureType.POLY_PROXY,
    );
    expect(toSignatureType(WalletType.GNOSIS_SAFE)).toBe(
      SignatureType.POLY_GNOSIS_SAFE,
    );
  });

  it.each([
    {
      derive: () => signer,
      expectedWallet: signer,
      walletType: WalletType.EOA,
    },
    {
      derive: deriveBeaconDepositWalletAddress,
      expectedWallet: '0x94bf330955a0b957662feaf878de77bf25f76cd9',
      walletType: WalletType.DEPOSIT_WALLET,
    },
    {
      derive: deriveUupsDepositWalletAddress,
      expectedWallet: '0x57ffbc34de23124faeb8387fcd689d314e57accd',
      walletType: WalletType.DEPOSIT_WALLET,
    },
    {
      derive: deriveProxyWalletAddress,
      expectedWallet: '0x7754536ecd85c00b2e0cf9c1aa679340d8550756',
      walletType: WalletType.POLY_PROXY,
    },
    {
      derive: deriveSafeWalletAddress,
      expectedWallet: '0x766b6851a199bf91ae3fa13b1cfac5187355118f',
      walletType: WalletType.GNOSIS_SAFE,
    },
  ] as const)('derives and classifies wallet type $walletType', ({
    derive,
    expectedWallet,
    walletType,
  }) => {
    const wallet = derive(signer, production.walletDerivation);

    expect(wallet).toBe(expectedWallet);
    expect(resolveAccountIdentity(production, signer, wallet)).toEqual({
      signer,
      wallet,
      walletType,
    });
  });

  it('matches deterministic wallets case-insensitively', () => {
    const derivedWallet = deriveBeaconDepositWalletAddress(
      signer,
      production.walletDerivation,
    );
    const depositWallet = expectEvmAddress(
      `0x${derivedWallet.slice(2).toUpperCase()}`,
    );

    expect(resolveAccountIdentity(production, signer, depositWallet)).toEqual({
      signer,
      wallet: depositWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
  });

  it('rejects unsupported wallet addresses', () => {
    const unknownWallet = expectEvmAddress(
      '0x0000000000000000000000000000000000000002',
    );

    expect(() =>
      resolveAccountIdentity(production, signer, unknownWallet),
    ).toThrow(/does not match the signer/);
  });
});

describe('deposit wallet factory detection', () => {
  const factory = production.walletDerivation.depositWalletFactory;
  const beacon = production.walletDerivation.depositWalletBeacon;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('detects beacon factories from BEACON return data', async () => {
    server.use(
      http.post(root, async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          method: 'eth_call',
          params: [{ to: factory, data: '0x49493a4d' }, 'latest'],
        });

        return HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          result: `0x000000000000000000000000${beacon.slice(2)}`,
        });
      }),
    );
    const rpc = new JsonRpcClient({ url: root });

    await expect(getDepositWalletFactoryBeacon(rpc, factory)).resolves.toBe(
      beacon,
    );
    await expect(isBeaconDepositWalletFactory(rpc, factory)).resolves.toBe(
      true,
    );
  });

  it('treats short BEACON return data as no beacon', async () => {
    server.use(
      http.post(root, () =>
        HttpResponse.json({ jsonrpc: '2.0', id: 1, result: '0x' }),
      ),
    );
    const rpc = new JsonRpcClient({ url: root });

    await expect(getDepositWalletFactoryBeacon(rpc, factory)).resolves.toBe(
      ZERO_ADDRESS,
    );
    await expect(isBeaconDepositWalletFactory(rpc, factory)).resolves.toBe(
      false,
    );
  });

  it('treats contract reverts as legacy UUPS factories', async () => {
    server.use(
      http.post(root, () =>
        HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          error: { code: 3, message: 'execution reverted' },
        }),
      ),
    );
    const rpc = new JsonRpcClient({ url: root });

    await expect(getDepositWalletFactoryBeacon(rpc, factory)).resolves.toBe(
      ZERO_ADDRESS,
    );
    await expect(isBeaconDepositWalletFactory(rpc, factory)).resolves.toBe(
      false,
    );
  });

  it('does not swallow generic JSON-RPC failures', async () => {
    server.use(
      http.post(root, () =>
        HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32_603, message: 'upstream unavailable' },
        }),
      ),
    );
    const rpc = new JsonRpcClient({ url: root });

    await expect(
      isBeaconDepositWalletFactory(rpc, factory),
    ).rejects.toMatchObject({
      message: 'JSON-RPC eth_call failed: upstream unavailable',
      name: 'RequestRejectedError',
    });
  });
});
