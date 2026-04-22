import { describe, expect, it } from 'vitest';
import { ListMarketsError } from './actions';
import {
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from './errors';

describe('error guards', () => {
  it('isError returns true for each member of the union', () => {
    expect(ListMarketsError.isError(new RateLimitError('rate limited'))).toBe(
      true,
    );
    expect(
      ListMarketsError.isError(
        new RequestRejectedError('rejected', { status: 400 }),
      ),
    ).toBe(true);
    expect(
      ListMarketsError.isError(new TransportError('transport failed')),
    ).toBe(true);
    expect(
      ListMarketsError.isError(new UnexpectedResponseError('unexpected')),
    ).toBe(true);
    expect(ListMarketsError.isError(new UserInputError('bad input'))).toBe(
      true,
    );
  });

  it('isError returns false for non-SDK errors', () => {
    expect(ListMarketsError.isError(new Error('plain error'))).toBe(false);
    expect(ListMarketsError.isError('string error')).toBe(false);
    expect(ListMarketsError.isError(null)).toBe(false);
    expect(ListMarketsError.isError(undefined)).toBe(false);
  });

  it('narrows to union type enabling switch on name', () => {
    const error: unknown = new RateLimitError('rate limited');
    if (ListMarketsError.isError(error)) {
      // TypeScript should allow switch on error.name here
      // This verifies type narrowing works at compile time
      const name = error.name;
      expect([
        'RateLimitError',
        'RequestRejectedError',
        'TransportError',
        'UnexpectedResponseError',
        'UserInputError',
      ]).toContain(name);
    }
  });
});
