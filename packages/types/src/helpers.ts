import { InvariantError } from './errors';

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
