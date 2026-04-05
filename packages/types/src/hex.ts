import type { Tagged } from 'type-fest';

/**
 * A string encoded as hexadecimal and prefixed with `0x`.
 */
export type HexString = `0x${string}`;

/**
 * A hex-encoded 32-byte private key prefixed with `0x`.
 */
export type PrivateKey = Tagged<HexString, 'PrivateKey'>;

/**
 * An EVM account or contract address.
 */
export type EvmAddress = Tagged<HexString, 'EvmAddress'>;

/**
 * A hex-encoded cryptographic signature.
 */
export type Signature = Tagged<HexString, 'Signature'>;

/**
 * A transaction hash returned by an EVM-compatible network.
 */
export type TxHash = Tagged<HexString, 'TxHash'>;

/**
 * Checks whether a value is a hex string prefixed with `0x`.
 */
export function isHexString(value: unknown): value is HexString {
  return typeof value === 'string' && /^0x[a-fA-F0-9]+$/.test(value);
}

/**
 * Checks whether a value is a hex-encoded 32-byte private key.
 */
export function isPrivateKey(value: unknown): value is PrivateKey {
  return isHexString(value) && value.length === 66;
}
