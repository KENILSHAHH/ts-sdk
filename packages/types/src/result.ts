import { type Result, ResultAsync } from 'neverthrow';

function throwError(error: unknown): never {
  throw error;
}

/**
 * Extracts the success value from a {@link Result} or {@link ResultAsync}, or
 * throws the error branch.
 *
 * @example
 * ```ts
 * const value = unwrap(result.andThen(step1).andThen(step2));
 *
 * // value === 42
 * ```
 *
 * @internal
 *
 * @param result - Result to unwrap.
 * @returns The success value of the `result`.
 */
export function unwrap<T, E>(result: Result<T, E>): T;
export function unwrap<T, E>(result: ResultAsync<T, E>): Promise<T>;
export function unwrap<T, E>(
  result: Result<T, E> | ResultAsync<T, E>,
): T | Promise<T> {
  if (result instanceof ResultAsync) {
    return result.match((value) => value, throwError);
  }

  return result.match((value) => value, throwError);
}
