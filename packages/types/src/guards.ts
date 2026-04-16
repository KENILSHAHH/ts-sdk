import type { NonEmptyArray } from './array';

/**
 * Returns `true` if the array contains at least one element.
 */
export function isNonEmptyArray<T>(
  value: readonly T[],
): value is NonEmptyArray<T> {
  return value.length > 0;
}

/**
 * Returns `true` if the value is `null` or `undefined`.
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Returns `true` if the value is not `null` or `undefined`.
 */
export function isPresent<T>(value: T): value is Exclude<T, null | undefined> {
  return !isNullish(value);
}
