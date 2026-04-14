import { SignatureType } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import type { HexString } from '@polymarket/types';
import {
  type EvmAddress,
  expectEvmAddress,
  expectHexString,
  never,
} from '@polymarket/types';
import { AbiParameters, ContractAddress, Hash } from 'ox';
import type { EnvironmentConfig, WalletDerivationConfig } from './environments';

export type AccountIdentity = {
  signer: EvmAddress;
  wallet: EvmAddress;
  walletType: WalletType;
};

/** @internal */
export function resolveAccountIdentity(
  environment: EnvironmentConfig,
  signer: EvmAddress,
  wallet: EvmAddress = signer,
): AccountIdentity {
  return {
    signer,
    wallet,
    walletType: classifyWalletType(environment, signer, wallet),
  };
}

/** @internal */
export function toSignatureType(walletType: WalletType): SignatureType {
  switch (walletType) {
    case WalletType.EOA:
      return SignatureType.EOA;
    case WalletType.POLY_PROXY:
      return SignatureType.POLY_PROXY;
    case WalletType.POLY_GNOSIS_SAFE:
      return SignatureType.POLY_GNOSIS_SAFE;
  }
}

const PROXY_BYTECODE_TEMPLATE =
  '3d3d606380380380913d393d73%s5af4602a57600080fd5b602d8060366000396000f3363d3d373d3d3d363d73%s5af43d82803e903d91602b57fd5bf352e831dd00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000';

function proxyWalletBytecodeHash(config: WalletDerivationConfig): HexString {
  const bytecode = PROXY_BYTECODE_TEMPLATE.replace(
    '%s',
    config.proxyFactory.slice(2).toLowerCase(),
  ).replace('%s', config.proxyImplementation.slice(2).toLowerCase());

  return expectHexString(Hash.keccak256(`0x${bytecode}`));
}

function deriveProxyWalletAddress(
  signer: EvmAddress,
  config: WalletDerivationConfig,
): EvmAddress {
  return expectEvmAddress(
    ContractAddress.fromCreate2({
      bytecodeHash: proxyWalletBytecodeHash(config),
      from: config.proxyFactory,
      salt: Hash.keccak256(AbiParameters.encodePacked(['address'], [signer])),
    }),
  );
}

/** @internal */
export function deriveSafeWalletAddress(
  signer: EvmAddress,
  config: WalletDerivationConfig,
): EvmAddress {
  return expectEvmAddress(
    ContractAddress.fromCreate2({
      bytecodeHash: config.safeInitCodeHash,
      from: config.safeFactory,
      salt: Hash.keccak256(
        AbiParameters.encode([{ name: 'address', type: 'address' }], [signer]),
      ),
    }),
  );
}

function sameAddress(left: EvmAddress, right: EvmAddress): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function classifyWalletType(
  environment: EnvironmentConfig,
  signer: EvmAddress,
  wallet: EvmAddress,
): WalletType {
  if (sameAddress(wallet, signer)) {
    return WalletType.EOA;
  }

  const config = environment.walletDerivation;

  if (sameAddress(wallet, deriveProxyWalletAddress(signer, config))) {
    return WalletType.POLY_PROXY;
  }

  if (sameAddress(wallet, deriveSafeWalletAddress(signer, config))) {
    return WalletType.POLY_GNOSIS_SAFE;
  }

  never(
    `Wallet ${wallet} does not match the signer ${signer} or any supported deterministic wallet address.`,
  );
}
