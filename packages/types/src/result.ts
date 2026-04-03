import type { Result } from 'neverthrow';

function throwError(error: unknown): never {
  throw error;
}

/**
 * Extracts the success value from a {@link Result} or throws the error branch.
 *
 * @example
 * ```ts
 * const value = unwrap(
 *   result
 *     .andThen(step1)
 *     .andThen(step2),
 * );
 *
 * // value === 42
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  return result.match(
    (value) => value,
    throwError,
  );
}
