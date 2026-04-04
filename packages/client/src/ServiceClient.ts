import { err, never, ok, type Result, ResultAsync } from '@polymarket/types';
import ky, { HTTPError, type KyInstance } from 'ky';
import type { z } from 'zod';
import { InvalidResponseError, RateLimitError, ServerError } from './errors';

export type ServiceClientConfig = {
  root: string;
};

export type ServiceClientGetOptions<TReturnType> = {
  schema: z.ZodType<TReturnType>;
  params?: URLSearchParams;
};

export type ServiceClientGetBlobOptions = {
  params?: URLSearchParams;
};

export type ServiceClientPostOptions = {
  json?: unknown;
};

/**
 * Internal wrapper around a service-scoped `ky` instance.
 */
export class ServiceClient {
  readonly #client: KyInstance;

  constructor({ root }: ServiceClientConfig) {
    this.#client = ky.create({ prefixUrl: root });
  }

  get<TReturnType>(
    path: string,
    options: ServiceClientGetOptions<TReturnType>,
  ): ResultAsync<
    TReturnType,
    RateLimitError | ServerError | InvalidResponseError
  > {
    return ResultAsync.fromPromise(
      this.#client.get(path, { searchParams: options.params }),
      (e) => this.#toServiceClientError(e),
    ).andThen((response) =>
      ResultAsync.fromPromise(
        response.json<unknown>(),
        () =>
          new InvalidResponseError(
            `Received non-JSON response from ${response.url}`,
          ),
      ).andThen((payload) =>
        this.#validateResponse(response.url, options.schema, payload),
      ),
    );
  }

  getBlob(
    path: string,
    options: ServiceClientGetBlobOptions = {},
  ): ResultAsync<Blob, RateLimitError | ServerError | InvalidResponseError> {
    return ResultAsync.fromPromise(
      this.#client.get(path, { searchParams: options.params }),
      (e) => this.#toServiceClientError(e),
    ).andThen((response) =>
      ResultAsync.fromPromise(
        response.blob(),
        () =>
          new InvalidResponseError(
            `Received unreadable binary response from ${response.url}`,
          ),
      ),
    );
  }

  post(_path: string, _options?: ServiceClientPostOptions): never {
    return never('ServiceClient.post is not implemented yet');
  }

  del(_path: string): never {
    return never('ServiceClient.del is not implemented yet');
  }

  #toServiceClientError(error: unknown): RateLimitError | ServerError {
    if (error instanceof HTTPError) {
      const { url } = error.response;

      if (error.response.status === 429) {
        return new RateLimitError(`Request to ${url} was rate limited`);
      }

      return new ServerError(
        `Request to ${url} failed with status ${error.response.status}`,
      );
    }

    return new ServerError(
      error instanceof Error ? error.message : 'Request failed',
    );
  }

  #validateResponse<TReturnType>(
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
}
