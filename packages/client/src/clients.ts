import { ApiKeySchema, EvmAddressSchema } from '@polymarket/bindings';
import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import {
  expectEvmAddress,
  expectEvmSignature,
  invariant,
  type Prettify,
} from '@polymarket/types';
import { z } from 'zod';
import type { AccountIdentity } from './account';
import { resolveAccountIdentity } from './account';
import {
  createOrDeriveApiKey,
  deleteApiKey,
  fetchApiKeys,
} from './actions/auth';
import { createApiKeyAuthTypedDataPayload } from './authentication';
import {
  allActions,
  type PublicActions,
  type SecureActions,
} from './decorators';
import { type EnvironmentConfig, production } from './environments';
import { RequestRejectedError, SigningError } from './errors';
import { buildHmacSignature } from './hmac';
import { parseUserInput } from './input';
import type { ServiceRequest } from './ServiceClient';
import { ServiceClient } from './ServiceClient';
import type { ApiKeyAuthorization } from './types';
import { type AuthenticationWorkflow, requestAddress } from './workflow';

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

// biome-ignore lint/complexity/noBannedTypes: intentional
export type ClientActions = {};

export type ClientDecorator<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
> = {
  (client: PublicClient<ClientActions, ClientActions>): TPublicActions;
  (client: SecureClient<ClientActions, ClientActions>): TSecureActions;
};

type DecoratorPublicActions<TDecorator extends ClientDecorator> =
  TDecorator extends ClientDecorator<
    infer TPublicActions,
    infer _TSecureActions
  >
    ? TPublicActions
    : never;

type DecoratorSecureActions<TDecorator extends ClientDecorator> =
  TDecorator extends ClientDecorator<
    infer _TPublicActions,
    infer TSecureActions
  >
    ? TSecureActions
    : never;

abstract class AbstractClient<TContext extends PublicContext> {
  // Keep the backing context off the public object shape so accidental
  // client logs do not print secure credentials.
  readonly #context: TContext;
  readonly #decorators: ClientDecorator[];

  protected get context(): TContext {
    return this.#context;
  }

  protected get decorators(): readonly ClientDecorator[] {
    return this.#decorators;
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
    this.#decorators = [];
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

  protected rememberDecorator(decorator: ClientDecorator): void {
    this.#decorators.push(decorator);
  }
}

const BeginAuthenticationCredentialsSchema = z.object({
  key: ApiKeySchema,
  passphrase: z.string(),
  secret: z.string(),
});

export type BeginAuthenticationRequest =
  | {
      /**
       * Wallet address to authenticate as.
       *
       * Pass the signer address itself to authenticate as an EOA account.
       */
      wallet: string;

      /**
       * Existing API credentials to reuse when they remain valid.
       */
      credentials: ApiKeyCreds;
      nonce?: never;
    }
  | {
      /**
       * Wallet address to authenticate as.
       *
       * Pass the signer address itself to authenticate as an EOA account.
       */
      wallet: string;

      /**
       * Nonce used when creating or deriving fresh credentials.
       *
       * @defaultValue 0
       */
      nonce?: number;
      credentials?: never;
    };

const BeginAuthenticationRequestSchema: z.ZodType<BeginAuthenticationRequest> =
  z
    .object({
      wallet: EvmAddressSchema,
      credentials: BeginAuthenticationCredentialsSchema.optional(),
      nonce: z.number().int().positive().optional(),
    })
    .superRefine((value, context) => {
      if (value.credentials !== undefined && value.nonce !== undefined) {
        context.addIssue({
          code: 'custom',
          message: '`credentials` and `nonce` are mutually exclusive.',
          path: ['nonce'],
        });
      }
    })
    .transform((value): BeginAuthenticationRequest => {
      if (value.credentials !== undefined) {
        return {
          wallet: value.wallet,
          credentials: value.credentials,
        };
      }

      if (value.nonce !== undefined) {
        return {
          wallet: value.wallet,
          nonce: value.nonce,
        };
      }

      return {
        wallet: value.wallet,
      };
    });

type PublicClientConfig = {
  environment: EnvironmentConfig;
  apiKey?: ApiKeyAuthorization;
};

class BasePublicClient<
  TPublicActions extends ClientActions,
  TSecureActions extends ClientActions,
> extends AbstractClient<PublicContext> {
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

  /**
   * Use this to narrow a {@link Client} union to {@link SecureClient}.
   *
   * @example
   * ```ts
   * if (client.isSecureClient()) {
   *   client.credentials; // SecureClient
   * }
   * ```
   */
  isSecureClient(): this is SecureClient {
    return false;
  }

  /**
   * Use this to narrow a {@link Client} union to {@link PublicClient}.
   *
   * @example
   * ```ts
   * if (client.isPublicClient()) {
   *   client.beginAuthentication(...); // PublicClient
   * }
   * ```
   */
  isPublicClient(): this is PublicClient {
    return true;
  }

  /**
   * Returns a client typed with the methods contributed by the decorator.
   */
  extend<TDecorator extends ClientDecorator>(
    decorator: TDecorator,
  ): PublicClient<
    Prettify<TPublicActions & DecoratorPublicActions<TDecorator>>,
    Prettify<TSecureActions & DecoratorSecureActions<TDecorator>>
  > {
    this.rememberDecorator(decorator);
    Object.assign(this, decorator(this));
    return this as unknown as PublicClient<
      Prettify<TPublicActions & DecoratorPublicActions<TDecorator>>,
      Prettify<TSecureActions & DecoratorSecureActions<TDecorator>>
    >;
  }

  /**
   * Begins an authentication workflow that produces a {@link SecureClient}.
   */
  beginAuthentication(
    request: BeginAuthenticationRequest,
  ): Promise<
    AuthenticationWorkflow<SecureClient<TPublicActions, TSecureActions>>
  > {
    const params = parseUserInput(request, BeginAuthenticationRequestSchema);

    return Promise.resolve(
      async function* (
        this: PublicClient<TPublicActions, TSecureActions>,
      ): AuthenticationWorkflow<SecureClient<TPublicActions, TSecureActions>> {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = params?.nonce ?? 0;
        const signer = expectEvmAddress(yield requestAddress());
        const wallet = expectEvmAddress(params.wallet);
        const identity = resolveAccountIdentity(
          this.environment,
          signer,
          wallet,
        );

        if (params.credentials !== undefined) {
          const client = this.#createSecureClient(params.credentials, identity);

          try {
            const apiKeys = await fetchApiKeys(client);
            if (apiKeys.includes(params.credentials.key)) {
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
        const credentials = await createOrDeriveApiKey(
          this as unknown as PublicClient<TPublicActions, TSecureActions>,
          {
            address: signer,
            nonce,
            signature: expectEvmSignature(signature),
            timestamp,
          },
        );

        return this.#createSecureClient(credentials, identity);
      }.call(this as unknown as PublicClient<TPublicActions, TSecureActions>),
    );
  }

  #createSecureClient(
    credentials: ApiKeyCreds,
    account: AccountIdentity,
  ): SecureClient<TPublicActions, TSecureActions> {
    const client = new BaseSecureClient({
      account: account,
      apiKey: this.context.apiKey,
      credentials,
      environment: this.environment,
    });

    for (const decorator of this.decorators) {
      client.extend(decorator);
    }

    return client as SecureClient<TPublicActions, TSecureActions>;
  }
}

class BaseSecureClient<
  TPublicActions extends ClientActions,
  TSecureActions extends ClientActions,
> extends AbstractClient<SecureContext> {
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
   * Use this to narrow a {@link Client} union to {@link SecureClient}.
   *
   * @example
   * ```ts
   * if (client.isSecureClient()) {
   *   client.credentials; // SecureClient
   * }
   * ```
   */
  isSecureClient(): this is SecureClient {
    return true;
  }

  /**
   * Use this to narrow a {@link Client} union to {@link PublicClient}.
   *
   * @example
   * ```ts
   * if (client.isPublicClient()) {
   *   client.beginAuthentication(...); // PublicClient
   * }
   * ```
   */
  isPublicClient(): this is PublicClient {
    return false;
  }

  /**
   * Returns a secure client typed with the methods contributed by the decorator.
   */
  extend<TDecorator extends ClientDecorator>(
    decorator: TDecorator,
  ): SecureClient<
    TPublicActions,
    Prettify<TSecureActions & DecoratorSecureActions<TDecorator>>
  > {
    this.rememberDecorator(decorator);
    Object.assign(this, decorator(this));

    return this as unknown as SecureClient<
      TPublicActions,
      Prettify<TSecureActions & DecoratorSecureActions<TDecorator>>
    >;
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
  async endAuthentication(): Promise<
    PublicClient<TPublicActions, TSecureActions>
  > {
    const { apiKey, environment } = this.context;

    await deleteApiKey(this);
    this.endAuthenticationLifecycle();

    const client = new BasePublicClient({
      apiKey,
      environment,
    });

    for (const decorator of this.decorators) {
      client.extend(decorator);
    }

    return client as PublicClient<TPublicActions, TSecureActions>;
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

export type PublicClient<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
> = BasePublicClient<TPublicActions, TSecureActions> & TPublicActions;

export type SecureClient<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
> = BaseSecureClient<TPublicActions, TSecureActions> & TSecureActions;

export { BasePublicClient, BaseSecureClient };

export type Client<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
> =
  | PublicClient<TPublicActions, TSecureActions>
  | SecureClient<TPublicActions, TSecureActions>;

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
): PublicClient<PublicActions, SecureActions> {
  return new BasePublicClient({
    environment: options.environment ?? production,
    apiKey: options.apiKey,
  }).extend(allActions);
}
