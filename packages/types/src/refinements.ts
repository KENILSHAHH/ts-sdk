import { InvariantError } from './errors';
import {
  type EvmAddress,
  type EvmSignature,
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
  if (value === null || value === undefined) {
    throw new InvariantError(message);
  }

  return value as Exclude<T, null | undefined>;
}

/**
 * Refines an array to a non-empty tuple.
 */
export function expectNonEmptyArray<T>(
  value: readonly T[],
  message = 'Expected a non-empty array',
): NonEmptyArray<T> {
  if (value.length === 0) {
    throw new InvariantError(message);
  }

  return value as NonEmptyArray<T>;
}

/**
 * Refines a string to an EVM address or throws when the value is invalid.
 */
export function expectEvmAddress(
  value: string,
  message = 'Expected an EVM address',
): EvmAddress {
  if (!isHexString(value) || value.length !== 42) {
    throw new InvariantError(message);
  }

  return value as EvmAddress;
}

/**
 * Refines a string to an EVM signature or throws when the value is invalid.
 */
export function expectEvmSignature(
  value: string,
  message = 'Expected an EVM signature',
): EvmSignature {
  if (!isHexString(value) || value.length !== 132) {
    throw new InvariantError(message);
  }

  return value as EvmSignature;
}

/**
 * Refines a string to a transaction hash or throws when the value is invalid.
 */
export function expectTxHash(
  value: string,
  message = 'Expected a transaction hash',
): TxHash {
  if (!isHexString(value) || value.length !== 66) {
    throw new InvariantError(message);
  }

  return value as TxHash;
}
