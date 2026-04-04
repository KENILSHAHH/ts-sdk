import { err, ok, type Result, ResultAsync } from '@polymarket/types';
import type { z } from 'zod';
import { InvalidResponseError } from './errors';

export function validateWith<TReturnType>(schema: z.ZodType<TReturnType>) {
  return function validateResponse(
    response: Response,
  ): ResultAsync<TReturnType, InvalidResponseError> {
    return ResultAsync.fromPromise(
      response.json(),
      () =>
        new InvalidResponseError(
          `Received non-JSON response from ${response.url}`,
        ),
    ).andThen((payload) => parseResponse(response.url, schema, payload));
  };
}

export function readBlob(
  response: Response,
): ResultAsync<Blob, InvalidResponseError> {
  return ResultAsync.fromPromise(
    response.blob(),
    () =>
      new InvalidResponseError(
        `Received unreadable binary response from ${response.url}`,
      ),
  );
}

function parseResponse<TReturnType>(
  endpoint: string,
  schema: z.ZodType<TReturnType>,
  response: unknown,
): Result<TReturnType, InvalidResponseError> {
  const result = schema.safeParse(response);

  if (result.success) {
    return ok(result.data);
  }

  return err(InvalidResponseError.fromZodError(result.error, { endpoint }));
}
