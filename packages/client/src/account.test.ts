import { SignatureType } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import { expectEvmAddress } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import {
  deriveDepositWalletAddress,
  deriveProxyWalletAddress,
  deriveSafeWalletAddress,
  resolveAccountIdentity,
  toSignatureType,
} from './account';
import { production } from './environments';

describe('Account identity', () => {
  const signer = expectEvmAddress('0x0000000000000000000000000000000000000001');

  it('classifies EOA accounts', () => {
    expect(resolveAccountIdentity(production, signer)).toEqual({
      signer,
      wallet: signer,
      walletType: WalletType.EOA,
    });
    expect(toSignatureType(WalletType.EOA)).toBe(SignatureType.EOA);
  });

  it('derives and classifies Proxy accounts', () => {
    const proxyWallet = deriveProxyWalletAddress(
      signer,
      production.walletDerivation,
    );

    expect(proxyWallet).toBe('0x7754536ecd85c00b2e0cf9c1aa679340d8550756');
    expect(resolveAccountIdentity(production, signer, proxyWallet)).toEqual({
      signer,
      wallet: proxyWallet,
      walletType: WalletType.POLY_PROXY,
    });
    expect(toSignatureType(WalletType.POLY_PROXY)).toBe(
      SignatureType.POLY_PROXY,
    );
  });

  it('derives and classifies Gnosis Safe accounts', () => {
    const safeWallet = deriveSafeWalletAddress(
      signer,
      production.walletDerivation,
    );

    expect(safeWallet).toBe('0x766b6851a199bf91ae3fa13b1cfac5187355118f');
    expect(resolveAccountIdentity(production, signer, safeWallet)).toEqual({
      signer,
      wallet: safeWallet,
      walletType: WalletType.GNOSIS_SAFE,
    });
    expect(toSignatureType(WalletType.GNOSIS_SAFE)).toBe(
      SignatureType.POLY_GNOSIS_SAFE,
    );
  });

  it('derives and classifies Deposit Wallet accounts', () => {
    const depositWallet = deriveDepositWalletAddress(
      signer,
      production.walletDerivation,
    );

    expect(depositWallet).toBe('0x57ffbc34de23124faeb8387fcd689d314e57accd');
    expect(resolveAccountIdentity(production, signer, depositWallet)).toEqual({
      signer,
      wallet: depositWallet,
      walletType: WalletType.DEPOSIT_WALLET,
    });
    expect(toSignatureType(WalletType.DEPOSIT_WALLET)).toBe(
      SignatureType.POLY_1271,
    );
  });
});
