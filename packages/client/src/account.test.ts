import { SignatureType } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import {
  deriveBeaconDepositWalletAddress,
  deriveProxyWalletAddress,
  deriveSafeWalletAddress,
  deriveUupsDepositWalletAddress,
  resolveAccountIdentity,
  toSignatureType,
} from './account';
import { production } from './environments';

describe('Account identity', () => {
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
