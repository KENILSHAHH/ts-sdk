/**
 * Base class for errors thrown by the Polymarket SDK.
 */
export abstract class PolymarketError extends Error {
  /**
   * Returns `true` when the provided value is a `PolymarketError`.
   */
  static isError(error: unknown): error is PolymarketError {
    return error instanceof PolymarketError;
  }
}

/**
 * Error thrown when code reaches a state that should be impossible.
 */
export class InvariantError extends PolymarketError {
  override name = 'InvariantError' as const;
}
