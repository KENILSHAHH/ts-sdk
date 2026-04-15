import { invariant } from './helpers';
import {
  type EvmAddress,
  type EvmSignature,
  type HexString,
  isHexString,
  type TxHash,
} from './hex';

export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Refines a value to exclude `null` and `undefined`.
 */
export function expectPresent<T>(
  value: T,
  message = 'Expected value to be present',
): Exclude<T, null | undefined> {
  invariant(value !== null && value !== undefined, message);
  return value as Exclude<T, null | undefined>;
}

/**
 * Refines an array to a non-empty tuple.
 */
export function expectNonEmptyArray<T>(
  value: readonly T[],
  message = 'Expected a non-empty array',
): NonEmptyArray<T> {
  invariant(value.length > 0, message);

  return value as NonEmptyArray<T>;
}

export function expectHexString(
  value: string,
  message = 'Expected a hex string',
): HexString {
  invariant(isHexString(value), message);
  return value;
}

/**
 * Refines a string to an EVM address or throws when the value is invalid.
 */
export function expectEvmAddress(
  value: unknown,
  message = 'Expected an EVM address',
): EvmAddress {
  invariant(isHexString(value) && value.length === 42, message);
  return value as EvmAddress;
}

/**
 * Refines a string to an EVM signature or throws when the value is invalid.
 */
export function expectEvmSignature(
  value: unknown,
  message = 'Expected an EVM signature',
): EvmSignature {
  invariant(isHexString(value) && value.length === 132, message);
  return value as EvmSignature;
}

/**
 * Refines a string to a transaction hash or throws when the value is invalid.
 */
export function expectTxHash(
  value: unknown,
  message = 'Expected a transaction hash',
): TxHash {
  invariant(isHexString(value) && value.length === 66, message);
  return value as TxHash;
}
