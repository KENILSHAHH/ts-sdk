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
export class UnexpectedResponseError extends PolymarketError {
  override name = 'UnexpectedResponseError' as const;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
  }

  static fromZodError(
    error: ZodError,
    context: ResponseValidationContext,
  ): UnexpectedResponseError {
    return new UnexpectedResponseError(formatResponseZodError(error, context), {
      cause: error,
    });
  }
}

/**
 * Error thrown when the SDK cannot complete a request because of a transport
 * failure.
 */
export class TransportError extends PolymarketError {
  override name = 'TransportError' as const;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
  }

  static fromError(error: unknown): TransportError {
    return new TransportError(
      error instanceof Error ? error.message : 'Request failed',
      {
        cause: error,
      },
    );
  }
}

export type RequestRejectedErrorOptions = {
  status: number;
};

/**
 * Error thrown when the service rejects a request with a non-success status.
 */
export class RequestRejectedError extends PolymarketError {
  override name = 'RequestRejectedError' as const;

  readonly status: number;

  constructor(
    message: string,
    options: ErrorOptions & RequestRejectedErrorOptions,
  ) {
    super(message, options);
    this.status = options.status;
  }
}

/**
 * Error thrown when the service rejects a request because the rate limit has
 * been exceeded.
 */
export class RateLimitError extends PolymarketError {
  override name = 'RateLimitError' as const;
}
