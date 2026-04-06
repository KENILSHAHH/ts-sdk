import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import { expectEvmAddress, expectSignature } from '@polymarket/types';
import { createOrDeriveApiKey, fetchApiKeys } from './actions/auth';
import {
  type AuthenticationWorkflow,
  createL2AuthTypedDataPayload,
} from './authentication';
import { type EnvironmentConfig, production } from './environments';
import { RequestRejectedError } from './errors';
import { ServiceClient } from './ServiceClient';

export type PublicClientConfig = {
  /**
   * The environment configuration used by the client.
   *
   * @defaultValue `production`
   */
  environment?: EnvironmentConfig;
};

export type BeginAuthenticationOptions =
  | { credentials: ApiKeyCreds }
  | { nonce: number };

type Context = {
  /** @internal */
  environment: EnvironmentConfig;
  /** @internal */
  clob: ServiceClient;
  /** @internal */
  gamma: ServiceClient;
  /** @internal */
  data: ServiceClient;
};

type SecureContext = Context & {
  /** @internal */
  address: string;
  /** @internal */
  credentials: ApiKeyCreds;
};

abstract class AbstractClient<TContext extends Context> {
  protected readonly context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  /** @internal */
  get environment(): EnvironmentConfig {
    return this.context.environment;
  }

  /** @internal */
  get clob(): ServiceClient {
    return this.context.clob;
  }

  /** @internal */
  get gamma(): ServiceClient {
    return this.context.gamma;
  }

  /** @internal */
  get data(): ServiceClient {
    return this.context.data;
  }
}

class PublicClient extends AbstractClient<Context> {
  resume(_credentials: ApiKeyCreds): SecureClient {
    throw new Error('resume is not implemented yet');
  }

  beginAuthentication(
    options?: BeginAuthenticationOptions,
  ): Promise<AuthenticationWorkflow> {
    return Promise.resolve(
      async function* (this: PublicClient): AuthenticationWorkflow {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce =
          options !== undefined && 'nonce' in options ? options.nonce : 0;
        const address = expectEvmAddress(yield { kind: 'requestAddress' });

        if (options !== undefined && 'credentials' in options) {
          const client = this.createSecureClient(options.credentials, address);

          try {
            if (
              (await fetchApiKeys(client)).includes(options.credentials.key)
            ) {
              return client;
            }
          } catch (error) {
            if (
              !(error instanceof RequestRejectedError) ||
              error.status !== 401
            ) {
              throw error;
            }
          }
        }

        const signature = yield {
          kind: 'signAuthMessage',
          payload: createL2AuthTypedDataPayload({
            address,
            chainId: this.environment.chainId,
            nonce,
            timestamp,
          }),
        };
        const credentials = await createOrDeriveApiKey(this, {
          address,
          nonce,
          signature: expectSignature(signature),
          timestamp,
        });

        return this.createSecureClient(credentials, address);
      }.call(this),
    );
  }

  createSecureClient(credentials: ApiKeyCreds, address: string): SecureClient {
    return new SecureClient({
      ...this.context,
      address,
      credentials,
    });
  }
}

class SecureClient extends AbstractClient<SecureContext> {
  /** @internal */
  get credentials(): ApiKeyCreds {
    return this.context.credentials;
  }

  /** @internal */
  get address(): string {
    return this.context.address;
  }
}

export type { PublicClient, SecureClient };

export type Client = PublicClient | SecureClient;

function createPublicContext({
  environment = production,
}: PublicClientConfig): Context {
  return {
    environment,
    clob: new ServiceClient({
      root: environment.clob,
    }),
    gamma: new ServiceClient({
      root: environment.gamma,
    }),
    data: new ServiceClient({
      root: environment.data,
    }),
  };
}

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
  return new PublicClient(createPublicContext(config));
}
