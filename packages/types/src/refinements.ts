import { InvariantError } from './errors';

export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Refines a value to exclude `null` and `undefined`.
 */
export function nonNullable<T>(
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
export function nonEmptyArray<T>(
  value: readonly T[],
  message = 'Expected a non-empty array',
): NonEmptyArray<T> {
  if (value.length === 0) {
    throw new InvariantError(message);
  }

  return value as NonEmptyArray<T>;
}
