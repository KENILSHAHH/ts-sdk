import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import type { EvmAddress } from '@polymarket/types';
import {
  expectEvmAddress,
  expectEvmSignature,
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
  requestAddress,
} from './authentication';
import { type EnvironmentConfig, production } from './environments';
import { RequestRejectedError, SigningError } from './errors';
import { buildHmacSignature } from './hmac';
import { ServiceClient, type ServiceRequest } from './ServiceClient';
import type { ApiKeyAuthorization } from './types';

type PublicContext = {
  /** @internal */
  apiKey?: ApiKeyAuthorization;
  /** @internal */
  environment: EnvironmentConfig;
  /** @internal */
  clob: ServiceClient;
  /** @internal */
  relayer: ServiceClient;
  /** @internal */
  gamma: ServiceClient;
  /** @internal */
  data: ServiceClient;
};

abstract class AbstractClient<TContext extends PublicContext> {
  // Keep the backing context off the public object shape so accidental
  // client logs do not print secure credentials.
  readonly #context: TContext;

  protected get context(): TContext {
    return this.#context;
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
  get relayer(): ServiceClient {
    return this.context.relayer;
  }

  /** @internal */
  get gamma(): ServiceClient {
    return this.context.gamma;
  }

  /** @internal */
  get data(): ServiceClient {
    return this.context.data;
  }

  /** @internal */
  get supportsGasless(): boolean {
    return this.context.apiKey?.supportGasless ?? false;
  }

  constructor(context: TContext) {
    this.#context = context;
  }

  protected async resolveClobHeaders(
    request: ServiceRequest,
  ): Promise<HeadersInit> {
    if (this.context.apiKey?.isBuilderKey) {
      return this.context.apiKey.authorize(request);
    }
    return Promise.resolve({});
  }

  protected async resolveRelayerHeaders(
    request: ServiceRequest,
  ): Promise<HeadersInit> {
    if (this.context.apiKey?.supportGasless) {
      return this.context.apiKey.authorize(request);
    }
    return Promise.resolve({});
  }
}

export type BeginAuthenticationOptions =
  | { credentials: ApiKeyCreds }
  | { nonce: number };

type PublicClientConfig = {
  environment: EnvironmentConfig;
  apiKey?: ApiKeyAuthorization;
};

export class PublicClient extends AbstractClient<PublicContext> {
  constructor(config: PublicClientConfig) {
    super({
      apiKey: config.apiKey,
      environment: config.environment,
      data: new ServiceClient({ root: config.environment.data }),
      gamma: new ServiceClient({ root: config.environment.gamma }),
      clob: new ServiceClient({
        root: config.environment.clob,
        resolveHeaders: (request) => this.resolveClobHeaders(request),
      }),
      relayer: new ServiceClient({
        root: config.environment.relayer,
        resolveHeaders: (request) => this.resolveRelayerHeaders(request),
      }),
    });
  }

  beginAuthentication(
    options?: BeginAuthenticationOptions,
  ): Promise<AuthenticationWorkflow> {
    return Promise.resolve(
      async function* (this: PublicClient): AuthenticationWorkflow {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce =
          options !== undefined && 'nonce' in options ? options.nonce : 0;
        const signer = expectEvmAddress(yield requestAddress());
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
          signature: expectEvmSignature(signature),
          timestamp,
        });

        return this.#createSecureClient(credentials, identity);
      }.call(this),
    );
  }

  async #resolveAccountIdentity(signer: EvmAddress): Promise<AccountIdentity> {
    const profile = await fetchPublicProfile(this, { address: signer });

    if (profile === null) {
      return {
        signer,
        wallet: signer,
        walletType: WalletType.EOA,
      };
    }

    const wallet = profile.proxyWallet ?? signer;
    const walletType = await fetchWalletType(this, {
      address: wallet,
      signer,
    });

    return {
      signer,
      wallet,
      walletType,
    };
  }

  #createSecureClient(
    credentials: ApiKeyCreds,
    account: AccountIdentity,
  ): SecureClient {
    return new SecureClient({
      account: account,
      apiKey: this.context.apiKey,
      credentials,
      environment: this.environment,
    });
  }
}

type SecureContext = PublicContext & {
  /** @internal */
  account: AccountIdentity;
  /** @internal */
  credentials: ApiKeyCreds;
  /** @internal */
  secureClob: ServiceClient;
};

type SecureClientConfig = PublicClientConfig & {
  account: AccountIdentity;
  credentials: ApiKeyCreds;
};

export class SecureClient extends AbstractClient<SecureContext> {
  #hasEndedAuthentication = false;

  /**
   * @remarks This is the choking point for all requests, so we can ensure that once
   * `endAuthentication` is called, no further authenticated requests can be made with this client instance.
   */
  protected override get context(): SecureContext {
    invariant(
      !this.#hasEndedAuthentication,
      'This client has ended authentication and can no longer be used.',
    );

    return super.context;
  }

  protected endAuthenticationLifecycle(): void {
    this.#hasEndedAuthentication = true;
  }

  constructor(config: SecureClientConfig) {
    super({
      account: config.account,
      credentials: config.credentials,
      apiKey: config.apiKey,
      environment: config.environment,
      clob: new ServiceClient({
        root: config.environment.clob,
        resolveHeaders: (request) => this.resolveClobHeaders(request),
      }),
      relayer: new ServiceClient({
        root: config.environment.relayer,
        resolveHeaders: (request) => this.resolveRelayerHeaders(request),
      }),
      gamma: new ServiceClient({ root: config.environment.gamma }),
      data: new ServiceClient({ root: config.environment.data }),
      secureClob: new ServiceClient({
        resolveHeaders: async (request) => ({
          ...(await this.resolveClobHeaders(request)),
          ...(await this.#createL2Headers(request)),
        }),
        root: config.environment.clob,
      }),
    });
  }

  /** @internal */
  get credentials(): ApiKeyCreds {
    return this.context.credentials;
  }

  /** @internal */
  get account(): AccountIdentity {
    return this.context.account;
  }

  /** @internal */
  get secureClob(): ServiceClient {
    return this.context.secureClob;
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
    const { apiKey, environment } = this.context;

    await deleteApiKey(this);
    this.endAuthenticationLifecycle();

    return new PublicClient({
      apiKey,
      environment,
    });
  }

  async #createL2Headers(request: ServiceRequest): Promise<HeadersInit> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      return {
        POLY_ADDRESS: this.account.signer,
        POLY_API_KEY: this.credentials.key,
        POLY_PASSPHRASE: this.credentials.passphrase,
        POLY_SIGNATURE: await buildHmacSignature(
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
        'Could not sign the L2-authenticated request',
      );
    }
  }
}

export type Client = PublicClient | SecureClient;

export type PublicClientOptions = {
  /**
   * The environment configuration used by the client.
   *
   * @defaultValue `production`
   */
  environment?: EnvironmentConfig;

  /**
   * Optional request authorization applied by the client when needed.
   */
  apiKey?: ApiKeyAuthorization;
};

/**
 * Creates a new `PublicClient` instance.
 *
 * @example
 * ```ts
 * const client = createPublicClient();
 * ```
 */
export function createPublicClient(
  options: PublicClientOptions = {},
): PublicClient {
  return new PublicClient({
    environment: options.environment ?? production,
    apiKey: options.apiKey,
  });
}
