import { z } from 'zod';
import { SigningError } from './errors';
import type { ApiKeyAuthorization, ApiKeyAuthorizationRequest } from './types';

export type RelayerApiKeyConfig = {
  key: string;
  address: string;
};

export type RemoteBuilderSigningConfig = {
  /**
   * URL for the application's remote builder-signing endpoint.
   *
   * This may be an absolute `http` or `https` URL, or a root-relative path
   * such as `/api/builder/sign` in browser environments.
   */
  url: string;
  /**
   * Fetch credential mode for requests to the remote signer.
   *
   * Set this when the signer relies on cookie-backed authentication, especially
   * for cross-origin requests that require `include`.
   */
  credentials?: RequestCredentials;
  /**
   * Additional headers to send to the remote signer.
   *
   * Use this for application-specific authorization such as bearer tokens,
   * tenant headers, or CSRF headers. The SDK always sends JSON.
   */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
};

const RemoteBuilderSigningResponseSchema = z.object({
  POLY_BUILDER_API_KEY: z.string().min(1),
  POLY_BUILDER_TIMESTAMP: z.string().min(1),
  POLY_BUILDER_PASSPHRASE: z.string().min(1),
  POLY_BUILDER_SIGNATURE: z.string().min(1),
});

export function remoteBuilderSigning(
  config: RemoteBuilderSigningConfig,
): ApiKeyAuthorization {
  return new RemoteBuilderAuthorization(config);
}

export function relayerApiKey(
  config: RelayerApiKeyConfig,
): ApiKeyAuthorization {
  return new RelayerApiKeyAuthorization(config);
}

class RemoteBuilderAuthorization implements ApiKeyAuthorization {
  readonly #config: RemoteBuilderSigningConfig;

  constructor(config: RemoteBuilderSigningConfig) {
    this.#config = config;
  }

  get isBuilderKey(): boolean {
    return true;
  }

  get supportGasless(): boolean {
    return true;
  }

  async authorize(request: ApiKeyAuthorizationRequest): Promise<HeadersInit> {
    try {
      return await this.#fetchBuilderKeyHeaders(request);
    } catch (error) {
      throw SigningError.fromError(
        error,
        'Could not authorize the builder-authenticated request',
      );
    }
  }

  async #resolveHeaders(): Promise<Headers> {
    const headers = this.#config.headers;
    const resolvedHeaders =
      typeof headers === 'function' ? await headers() : headers;
    const requestHeaders = new Headers(resolvedHeaders);

    requestHeaders.set('content-type', 'application/json');

    return requestHeaders;
  }

  async #fetchBuilderKeyHeaders(
    request: ApiKeyAuthorizationRequest,
  ): Promise<HeadersInit> {
    const response = await fetch(this.#config.url, {
      body: JSON.stringify({
        body: request.body,
        method: request.method,
        path: request.path,
      }),
      credentials: this.#config.credentials,
      headers: await this.#resolveHeaders(),
      method: 'POST',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(
        `Remote signer rejected request with status ${response.status}`,
      );
    }

    return RemoteBuilderSigningResponseSchema.parse(await response.json());
  }
}

class RelayerApiKeyAuthorization implements ApiKeyAuthorization {
  readonly #config: RelayerApiKeyConfig;

  constructor(config: RelayerApiKeyConfig) {
    this.#config = config;
  }

  get isBuilderKey(): boolean {
    return false;
  }

  get supportGasless(): boolean {
    return true;
  }

  authorize(): Promise<HeadersInit> {
    return Promise.resolve({
      RELAYER_API_KEY: this.#config.key,
      RELAYER_API_KEY_ADDRESS: this.#config.address,
    });
  }
}
