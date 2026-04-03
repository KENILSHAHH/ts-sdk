import { PolymarketError } from '@polymarket/types';
import type { ZodError } from 'zod';
import {
  formatInputZodError,
  formatResponseZodError,
  type ResponseValidationContext,
} from './validation';

/**
 * Error thrown when a request is not correct for the SDK action being called.
 */
export class UserInputError extends PolymarketError {
  override name = 'UserInputError' as const;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
  }

  static fromZodError(error: ZodError): UserInputError {
    return new UserInputError(formatInputZodError(error), {
      cause: error,
    });
  }
}

/**
 * Error thrown when the server returns an unexpected response.
 */
export class InvalidResponseError extends PolymarketError {
  override name = 'InvalidResponseError' as const;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
  }

  static fromZodError(
    error: ZodError,
    context: ResponseValidationContext,
  ): InvalidResponseError {
    return new InvalidResponseError(formatResponseZodError(error, context), {
      cause: error,
    });
  }
}

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
