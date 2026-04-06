import type { ApiKeyResponse } from '@polymarket/bindings/clob';
import { expectEvmAddress, expectSignature } from '@polymarket/types';
import { createOrDeriveApiKey } from './actions/auth';
import {
  type AuthenticationWorkflow,
  createL2AuthTypedDataPayload,
} from './authentication';
import { type EnvironmentConfig, production } from './environments';
import { ServiceClient } from './ServiceClient';

export type PublicClientConfig = {
  /**
   * The environment configuration used by the client.
   *
   * @defaultValue `production`
   */
  environment?: EnvironmentConfig;
};

export class PublicClient {
  /** @internal */
  readonly environment: EnvironmentConfig;

  /** @internal */
  readonly clob: ServiceClient;

  /** @internal */
  readonly gamma: ServiceClient;

  /** @internal */
  readonly data: ServiceClient;

  constructor({ environment = production }: PublicClientConfig = {}) {
    this.environment = environment;
    this.clob = new ServiceClient({
      root: environment.clob,
    });
    this.gamma = new ServiceClient({
      root: environment.gamma,
    });
    this.data = new ServiceClient({
      root: environment.data,
    });
  }

  resume(_credentials: ApiKeyResponse): SecureClient {
    throw new Error('resume is not implemented yet');
  }

  beginAuthentication(): Promise<AuthenticationWorkflow> {
    return Promise.resolve(
      async function* (this: PublicClient): AuthenticationWorkflow {
        const timestamp = Math.floor(Date.now() / 1000);
        const address = expectEvmAddress(yield { kind: 'requestAddress' });
        const signature = yield {
          kind: 'signAuthMessage',
          payload: createL2AuthTypedDataPayload({
            address,
            chainId: this.environment.chainId,
            timestamp,
          }),
        };
        const credentials = await createOrDeriveApiKey(this, {
          address,
          nonce: 0,
          signature: expectSignature(signature),
          timestamp,
        });

        return new SecureClient(
          { environment: this.environment },
          credentials,
          address,
        );
      }.call(this),
    );
  }
}

class SecureClient extends PublicClient {
  readonly #credentials: ApiKeyResponse;
  readonly #address: string;

  constructor(
    config: PublicClientConfig,
    credentials: ApiKeyResponse,
    address: string,
  ) {
    super(config);
    this.#credentials = credentials;
    this.#address = address;
  }

  /** @internal */
  get credentials(): ApiKeyResponse {
    return this.#credentials;
  }

  /** @internal */
  get address(): string {
    return this.#address;
  }
}

export type { SecureClient };

export type Client = PublicClient | SecureClient;

/**
 * Creates a new `PublicClient` instance.
 *
 * @example
 * ```ts
 * const client = createPublicClient();
 * ```
 */
export function createPublicClient(
  config: PublicClientConfig = {},
): PublicClient {
  return new PublicClient(config);
}
