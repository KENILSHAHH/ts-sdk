import { ResultAsync } from '@polymarket/types';
import ky, { type KyInstance } from 'ky';
import { RateLimitError, RequestRejectedError, TransportError } from './errors';

export type ServiceClientConfig = {
  root: string;
};

export type ServiceClientGetOptions = {
  headers?: HeadersInit;
  params?: URLSearchParams;
};

export type ServiceClientPostOptions = {
  headers?: HeadersInit;
  json?: unknown;
};

export type ServiceClientDeleteOptions = {
  headers?: HeadersInit;
  json?: unknown;
};

/**
 * Internal wrapper around a service-scoped `ky` instance.
 */
export class ServiceClient {
  readonly #client: KyInstance;

  constructor({ root }: ServiceClientConfig) {
    this.#client = ky.create({ prefixUrl: root, throwHttpErrors: false });
  }

  get(
    path: string,
    options: ServiceClientGetOptions = {},
  ): ResultAsync<
    Response,
    RateLimitError | RequestRejectedError | TransportError
  > {
    return this.#toResult(
      this.#client.get(this.#normalizePath(path), {
        headers: options.headers,
        searchParams: options.params,
      }),
    );
  }

  post(
    path: string,
    options: ServiceClientPostOptions = {},
  ): ResultAsync<
    Response,
    RateLimitError | RequestRejectedError | TransportError
  > {
    return this.#toResult(
      this.#client.post(this.#normalizePath(path), {
        headers: options.headers,
        json: options.json,
      }),
    );
  }

  del(
    path: string,
    options: ServiceClientDeleteOptions = {},
  ): ResultAsync<
    Response,
    RateLimitError | RequestRejectedError | TransportError
  > {
    return this.#toResult(
      this.#client.delete(this.#normalizePath(path), {
        headers: options.headers,
        json: options.json,
      }),
    );
  }

  #normalizePath(path: string) {
    return path.startsWith('/') ? path.slice(1) : path;
  }

  #toResult(
    promise: Promise<Response>,
  ): ResultAsync<
    Response,
    | RateLimitError
    | RequestRejectedError
    | RequestRejectedError
    | TransportError
  > {
    return ResultAsync.fromPromise(
      promise.then(async (response) => {
        if (response.ok) {
          return response;
        }

        if (response.status === 429) {
          throw new RateLimitError(
            `Request to ${response.url} was rate limited`,
          );
        }

        const message = await this.#extractResponseErrorMessage(response);
        throw new RequestRejectedError(message, {
          status: response.status,
        });
      }),
      (error) => {
        if (
          error instanceof RateLimitError ||
          error instanceof RequestRejectedError
        ) {
          return error;
        }

        return TransportError.fromError(error);
      },
    );
  }

  async #extractResponseErrorMessage(response: Response) {
    if (response.headers.get('content-type')?.includes('application/json')) {
      const { error } = await response
        .clone()
        .json()
        .catch(() => ({}));
      if (error) return String(error);
    }

    const text = await response
      .clone()
      .text()
      .then(
        (body) => body.trim(),
        () => '',
      );

    if (text) {
      return text;
    }

    return `Request to ${response.url} failed with status ${response.status} and unreadable response body`;
  }
}
