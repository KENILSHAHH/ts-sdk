import { SignatureType } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import type { HexString } from '@polymarket/types';
import {
  type EvmAddress,
  expectEvmAddress,
  expectHexString,
  isSameEvmAddress,
  never,
} from '@polymarket/types';
import { AbiParameters, Bytes, ContractAddress, Hash } from 'ox';
import type { EnvironmentConfig, WalletDerivationConfig } from './environments';

export type AccountIdentity = {
  /** Authenticated EOA that signs API authentication, orders, and wallet operations. */
  signer: EvmAddress;
  /** Active Polymarket account/funder wallet used for balances, positions, and execution. */
  wallet: EvmAddress;
  /** Wallet classification used for order signatures and transaction routing. */
  walletType: WalletType;
};

/** @internal */
export function resolveAccountIdentity(
  environment: EnvironmentConfig,
  signer: EvmAddress,
  wallet: EvmAddress,
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
    case WalletType.GNOSIS_SAFE:
      return SignatureType.POLY_GNOSIS_SAFE;
    case WalletType.DEPOSIT_WALLET:
      return SignatureType.POLY_1271;
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

/** @internal */
export function deriveProxyWalletAddress(
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

const ERC1967_CONST1 =
  '0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3';
const ERC1967_CONST2 =
  '0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076';
const ERC1967_PREFIX = 0x61003d3d8160233d3973n;

/** @internal */
export function deriveDepositWalletAddress(
  signer: EvmAddress,
  config: WalletDerivationConfig,
): EvmAddress {
  const walletId = expectHexString(`0x${signer.slice(2).padStart(64, '0')}`);
  const args = AbiParameters.encode(
    [{ type: 'address' }, { type: 'bytes32' }],
    [config.depositWalletFactory, walletId],
  );

  return expectEvmAddress(
    ContractAddress.fromCreate2({
      bytecodeHash: depositWalletInitCodeHash(
        config.depositWalletImplementation,
        args,
      ),
      from: config.depositWalletFactory,
      salt: Hash.keccak256(args),
    }),
  );
}

function depositWalletInitCodeHash(
  implementation: EvmAddress,
  args: HexString,
): HexString {
  const argsByteLength = BigInt((args.length - 2) / 2);
  const prefix = ERC1967_PREFIX + (argsByteLength << 56n);

  return expectHexString(
    Hash.keccak256(
      Bytes.concat(
        Bytes.fromNumber(prefix, { size: 10 }),
        Bytes.fromHex(implementation),
        Bytes.fromHex('0x6009'),
        Bytes.fromHex(ERC1967_CONST2),
        Bytes.fromHex(ERC1967_CONST1),
        Bytes.fromHex(args),
      ),
      { as: 'Hex' },
    ),
  );
}

function classifyWalletType(
  environment: EnvironmentConfig,
  signer: EvmAddress,
  wallet: EvmAddress,
): WalletType {
  if (isSameEvmAddress(wallet, signer)) {
    return WalletType.EOA;
  }

  const config = environment.walletDerivation;

  if (isSameEvmAddress(wallet, deriveDepositWalletAddress(signer, config))) {
    return WalletType.DEPOSIT_WALLET;
  }

  if (isSameEvmAddress(wallet, deriveProxyWalletAddress(signer, config))) {
    return WalletType.POLY_PROXY;
  }

  if (isSameEvmAddress(wallet, deriveSafeWalletAddress(signer, config))) {
    return WalletType.GNOSIS_SAFE;
  }

  never(
    `Wallet ${wallet} does not match the signer ${signer} or any supported deterministic wallet address.`,
  );
}
