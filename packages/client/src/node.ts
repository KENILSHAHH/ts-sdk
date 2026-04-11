import process from 'node:process';
import { invariant } from '@polymarket/types';
import {
  type PublicClientOptions as BasePublicClientOptions,
  PublicClient,
} from './clients';
import { production } from './environments';
import { SigningError } from './errors';
import { buildPolyHmacSignature } from './hmac';
import type {
  BuilderAuthorization,
  BuilderAuthorizationRequest,
} from './types';

invariant(
  process.release.name === 'node',
  'The @polymarket/client/node entrypoint requires a Node.js runtime.',
);
invariant(
  typeof window === 'undefined' && typeof document === 'undefined',
  'The @polymarket/client/node entrypoint cannot be imported in a browser-like runtime.',
);

export type LocalBuilderApiCredentials = {
  key: string;
  secret: string;
  passphrase: string;
};

export type PublicClientConfig = BasePublicClientOptions & {
  builder?: LocalBuilderApiCredentials;
};

/**
 * Creates a new `PublicClient` instance.
 *
 * @example
 * ```ts
 * const client = createPublicClient();
 * ```
 *
 * @example
 * With builder credentials
 * ```ts
 * const client = createPublicClient({
 *   builder: {
 *     key: process.env.POLYMARKET_BUILDER_API_KEY!,
 *     secret: process.env.POLYMARKET_BUILDER_SECRET!,
 *     passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
 *   },
 * });
 * ```
 */
export function createPublicClient(
  options: PublicClientConfig = {},
): PublicClient {
  return new PublicClient({
    environment: options.environment ?? production,
    builder: options.builder
      ? new LocalBuilderCredentials(options.builder)
      : undefined,
  });
}

class LocalBuilderCredentials implements BuilderAuthorization {
  readonly #credentials: LocalBuilderApiCredentials;

  constructor(credentials: LocalBuilderApiCredentials) {
    this.#credentials = credentials;
  }

  async authorize(request: BuilderAuthorizationRequest): Promise<HeadersInit> {
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
