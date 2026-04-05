import { InvariantError } from './errors';

/**
 * Asserts that a condition is truthy.
 *
 * @internal
 *
 * @param condition - Value expected to be truthy.
 * @param message - Message used for the thrown `InvariantError`.
 */
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

/**
 * Throws an `InvariantError` and narrows the current code path to `never`.
 *
 * Useful for unreachable branches and exhaustive checks.
 *
 * @param message - Message used for the thrown `InvariantError`.
 */
export function never(message = 'Unexpected call to never()'): never {
  throw new InvariantError(message);
}
