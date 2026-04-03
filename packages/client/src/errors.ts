import { PolymarketError } from '@polymarket/types';

/**
 * Error thrown when the API rejects a request due to rate limiting.
 */
export class RateLimitError extends PolymarketError {
  override name = 'RateLimitError' as const;
}

/**
 * Error thrown when the API fails due to a server-side problem.
 */
export class ServerError extends PolymarketError {
  override name = 'ServerError' as const;
}
