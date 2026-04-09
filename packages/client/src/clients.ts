import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import type { EvmAddress } from '@polymarket/types';
import {
  expectEvmAddress,
  expectSignature,
  invariant,
} from '@polymarket/types';
import type { AccountIdentity } from './account';
import {
  createOrDeriveApiKey,
  deleteApiKey,
  fetchApiKeys,
} from './actions/auth';
import { fetchPublicProfile } from './actions/profiles';
import { fetchWalletType } from './actions/wallets';
import {
  type AuthenticationWorkflow,
  createApiKeyAuthTypedDataPayload,
} from './authentication';
import { type EnvironmentConfig, production } from './environments';
import { RequestRejectedError, SigningError } from './errors';
import { buildPolyHmacSignature } from './hmac';
import { ServiceClient, type ServiceRequest } from './ServiceClient';

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
  account: AccountIdentity;
  /** @internal */
  credentials: ApiKeyCreds;
  /** @internal */
  secureClob: ServiceClient;
};

type SecureClientConfig = Context & {
  account: AccountIdentity;
  credentials: ApiKeyCreds;
};

abstract class AbstractClient<TContext extends Context> {
  // Keep the backing context off the public object shape so accidental
  // client logs do not print secure credentials.
  readonly #context: TContext;
  #hasEndedAuthentication = false;

  constructor(context: TContext) {
    this.#context = context;
  }

  protected getContext(): TContext {
    invariant(
      !this.#hasEndedAuthentication,
      'This client has ended authentication and can no longer be used.',
    );

    return this.#context;
  }

  protected endAuthenticationLifecycle(): void {
    this.#hasEndedAuthentication = true;
  }

  /** @internal */
  get environment(): EnvironmentConfig {
    return this.getContext().environment;
  }

  /** @internal */
  get clob(): ServiceClient {
    return this.getContext().clob;
  }

  /** @internal */
  get gamma(): ServiceClient {
    return this.getContext().gamma;
  }

  /** @internal */
  get data(): ServiceClient {
    return this.getContext().data;
  }
}

class PublicClient extends AbstractClient<Context> {
  beginAuthentication(
    options?: BeginAuthenticationOptions,
  ): Promise<AuthenticationWorkflow> {
    return Promise.resolve(
      async function* (this: PublicClient): AuthenticationWorkflow {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce =
          options !== undefined && 'nonce' in options ? options.nonce : 0;
        const signer = expectEvmAddress(yield { kind: 'requestAddress' });
        const identity = await this.#resolveAccountIdentity(signer);

        if (options !== undefined && 'credentials' in options) {
          const client = this.#createSecureClient(
            options.credentials,
            identity,
          );

          try {
            const apiKeys = await fetchApiKeys(client);
            if (apiKeys.includes(options.credentials.key)) {
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
          payload: createApiKeyAuthTypedDataPayload({
            address: signer,
            chainId: this.environment.chainId,
            nonce,
            timestamp,
          }),
        };
        const credentials = await createOrDeriveApiKey(this, {
          address: signer,
          nonce,
          signature: expectSignature(signature),
          timestamp,
        });

        return this.#createSecureClient(credentials, identity);
      }.call(this),
    );
  }

  async #resolveAccountIdentity(signer: EvmAddress): Promise<AccountIdentity> {
    const profile = await fetchPublicProfile(this, { address: signer });
    const wallet = profile.proxyWallet ?? signer;

    const walletType = await fetchWalletType(this, { address: wallet, signer });

    return {
      signer,
      wallet,
      walletType,
    };
  }

  #createSecureClient(
    credentials: ApiKeyCreds,
    identity: AccountIdentity,
  ): SecureClient {
    return new SecureClient({
      environment: this.environment,
      clob: this.clob,
      gamma: this.gamma,
      data: this.data,
      account: identity,
      credentials,
    });
  }
}

class SecureClient extends AbstractClient<SecureContext> {
  constructor(config: SecureClientConfig) {
    super({
      ...config,
      secureClob: new ServiceClient({
        resolveHeaders: async (request) => this.#createL2Headers(request),
        root: config.environment.clob,
      }),
    });
  }

  /** @internal */
  get credentials(): ApiKeyCreds {
    return this.getContext().credentials;
  }

  /** @internal */
  get account(): AccountIdentity {
    return this.getContext().account;
  }

  /** @internal */
  get secureClob(): ServiceClient {
    return this.getContext().secureClob;
  }

  /**
   * Ends authentication for this client and returns a public client.
   *
   * @remarks
   * This revokes the current authenticated credential and invalidates the
   * current `SecureClient` instance.
   *
   * @example
   * ```ts
   * const publicClient = await secureClient.endAuthentication();
   * ```
   */
  async endAuthentication(): Promise<PublicClient> {
    const context = this.getContext();

    await deleteApiKey(this);
    this.endAuthenticationLifecycle();

    return new PublicClient(toPublicContext(context));
  }

  async #createL2Headers(request: ServiceRequest): Promise<HeadersInit> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      return {
        POLY_ADDRESS: this.account.signer,
        POLY_API_KEY: this.credentials.key,
        POLY_PASSPHRASE: this.credentials.passphrase,
        POLY_SIGNATURE: await buildPolyHmacSignature(
          this.credentials.secret,
          timestamp,
          request.method,
          request.path,
          request.body,
        ),
        POLY_TIMESTAMP: `${timestamp}`,
      };
    } catch (error) {
      throw SigningError.fromError(
        error,
        'Could not sign the authenticated request',
      );
    }
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

function toPublicContext(context: Context): Context {
  return {
    clob: context.clob,
    data: context.data,
    environment: context.environment,
    gamma: context.gamma,
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
