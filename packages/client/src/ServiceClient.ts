import { never, ResultAsync } from '@polymarket/types';
import ky, { HTTPError, type KyInstance } from 'ky';
import { RateLimitError, ServerError } from './errors';

export type ServiceClientConfig = {
  root: string;
};

export type ServiceClientGetOptions = {
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

  get(
    path: string,
    options: ServiceClientGetOptions = {},
  ): ResultAsync<Response, RateLimitError | ServerError> {
    return ResultAsync.fromPromise(
      this.#client.get(path, { searchParams: options.params }),
      (e) => this.#toServiceClientError(e),
    );
  }

  post(
    path: string,
    options: ServiceClientPostOptions = {},
  ): ResultAsync<Response, RateLimitError | ServerError> {
    return ResultAsync.fromPromise(
      this.#client.post(path, { json: options.json }),
      (e) => this.#toServiceClientError(e),
    );
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
}
