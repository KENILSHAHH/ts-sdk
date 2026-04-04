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
  readonly clob: ServiceClient;

  /** @internal */
  readonly gamma: ServiceClient;

  /** @internal */
  readonly data: ServiceClient;

  constructor({ environment = production }: PublicClientConfig = {}) {
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
}

class IdentityClient extends PublicClient {}

export type { IdentityClient };

export type Client = PublicClient | IdentityClient;

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
