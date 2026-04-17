import { InvariantError } from './errors';

/**
 * Flattens an object type for clearer IDE hovers and inferred signatures.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

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

/**
 * Resolves after the provided delay in milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
