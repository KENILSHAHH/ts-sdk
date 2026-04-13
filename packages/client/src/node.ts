import process from 'node:process';
import { invariant } from '@polymarket/types';

export type { PublicClientOptions } from './clients';
export { createPublicClient } from './clients';

import { SigningError } from './errors';
import { buildPolyHmacSignature } from './hmac';
import type { ApiKeyAuthorization, ApiKeyAuthorizationRequest } from './types';

invariant(
  process.release.name === 'node',
  'The @polymarket/client/node entrypoint requires a Node.js runtime.',
);
invariant(
  typeof window === 'undefined' && typeof document === 'undefined',
  'The @polymarket/client/node entrypoint cannot be imported in a browser-like runtime.',
);

export type BuilderApiKeyOptions = {
  key: string;
  secret: string;
  passphrase: string;
};

export type RelayerApiKeyOptions = {
  key: string;
  address: string;
};

export function builderApiKey(
  options: BuilderApiKeyOptions,
): ApiKeyAuthorization {
  return new LocalBuilderApiKey(options);
}

export function relayerApiKey(
  options: RelayerApiKeyOptions,
): ApiKeyAuthorization {
  return new LocalRelayerApiKey(options);
}

class LocalBuilderApiKey implements ApiKeyAuthorization {
  readonly #credentials: BuilderApiKeyOptions;

  constructor(credentials: BuilderApiKeyOptions) {
    this.#credentials = credentials;
  }

  get isBuilderKey(): boolean {
    return true;
  }

  get supportGasless(): boolean {
    return true;
  }

  async authorize(request: ApiKeyAuthorizationRequest): Promise<HeadersInit> {
    return this.#authorize(request);
  }

  async #authorize(request: ApiKeyAuthorizationRequest): Promise<HeadersInit> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      return {
        POLY_BUILDER_API_KEY: this.#credentials.key,
        POLY_BUILDER_PASSPHRASE: this.#credentials.passphrase,
        POLY_BUILDER_SIGNATURE: await buildPolyHmacSignature(
          this.#credentials.secret,
          timestamp,
          request.method,
          request.path,
          request.body,
        ),
        POLY_BUILDER_TIMESTAMP: `${timestamp}`,
      };
    } catch (error) {
      throw SigningError.fromError(
        error,
        'Could not sign the builder-authenticated request',
      );
    }
  }
}

class LocalRelayerApiKey implements ApiKeyAuthorization {
  readonly #credentials: RelayerApiKeyOptions;

  constructor(credentials: RelayerApiKeyOptions) {
    this.#credentials = credentials;
  }

  get isBuilderKey(): boolean {
    return false;
  }

  get supportGasless(): boolean {
    return true;
  }

  authorize(): Promise<HeadersInit> {
    return Promise.resolve({
      RELAYER_API_KEY: this.#credentials.key,
      RELAYER_API_KEY_ADDRESS: this.#credentials.address,
    });
  }
}
