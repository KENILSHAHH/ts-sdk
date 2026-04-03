import { never, ResultAsync } from '@polymarket/types';
import ky, { HTTPError, type KyInstance } from 'ky';
import { RateLimitError, ServerError } from './errors';

export type ServiceClientConfig = {
  root: string;
};

export type ServiceClientPostOptions = {
  json?: unknown;
};

export type ServiceClientGetResult = ResultAsync<
  unknown,
  RateLimitError | ServerError
>;

/**
 * Internal wrapper around a service-scoped `ky` instance.
 */
export class ServiceClient {
  readonly #client: KyInstance;

  constructor({ root }: ServiceClientConfig) {
    this.#client = ky.create({ prefixUrl: root });
  }

  get(path: string, searchParams?: URLSearchParams): ServiceClientGetResult {
    return ResultAsync.fromPromise(
      this.#client.get(path, { searchParams }).json<unknown>(),
      toServiceClientError,
    );
  }

  post(_path: string, _options?: ServiceClientPostOptions): never {
    return never('ServiceClient.post is not implemented yet');
  }

  del(_path: string): never {
    return never('ServiceClient.del is not implemented yet');
  }
}

function toServiceClientError(error: unknown): RateLimitError | ServerError {
  if (error instanceof HTTPError) {
    if (error.response.status === 429) {
      return new RateLimitError('Request was rate limited');
    }

    return new ServerError(
      `Request failed with status ${error.response.status}`,
    );
  }

  if (error instanceof Error) {
    return new ServerError(error.message);
  }

  return new ServerError('Request failed');
}
