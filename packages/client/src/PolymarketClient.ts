import ky, { type KyInstance } from 'ky';
import { type EnvironmentConfig, production } from './environments';

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
  readonly gamma: KyInstance;

  constructor({ environment = production }: PolymarketClientConfig = {}) {
    this.gamma = ky.create({
      prefixUrl: environment.gamma,
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
