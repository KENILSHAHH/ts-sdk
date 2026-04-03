import { type EnvironmentConfig, production } from './environments';
import { ServiceClient } from './ServiceClient';

export type PolymarketClientConfig = {
  /**
   * The environment configuration used by the client.
   *
   * @defaultValue `production`
   */
  environment?: EnvironmentConfig;
};

export class PolymarketClient {
  /** @internal */
  readonly gamma: ServiceClient;

  /** @internal */
  readonly data: ServiceClient;

  constructor({ environment = production }: PolymarketClientConfig = {}) {
    this.gamma = new ServiceClient({
      root: environment.gamma,
    });
    this.data = new ServiceClient({
      root: environment.data,
    });
  }
}

/**
 * Creates a new `PolymarketClient` instance.
 *
 * @example
 * ```ts
 * const client = createClient();
 * ```
 */
export function createClient(
  config: PolymarketClientConfig = {},
): PolymarketClient {
  return new PolymarketClient(config);
}
