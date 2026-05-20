import { ApiKeySchema, EvmAddressSchema } from '@polymarket/bindings';
import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import {
  expectEvmAddress,
  expectEvmSignature,
  invariant,
  isSameEvmAddress,
  type Prettify,
} from '@polymarket/types';
import { z } from 'zod';
import type { AccountIdentity } from './account';
import {
  deriveUupsDepositWalletAddress,
  resolveAccountIdentity,
} from './account';
import {
  createOrDeriveApiKey,
  deleteApiKey,
  fetchApiKeys,
} from './actions/auth';
import {
  type DeployDepositWalletError,
  deployDepositWallet,
  type IsGaslessReadyError,
  isGaslessReady,
  type WaitForGaslessTransactionError,
} from './actions/gasless';
import { createApiKeyAuthTypedDataPayload } from './authentication';
import {
  allActions,
  type PublicActions,
  type SecureActions,
} from './decorators';
import { type EnvironmentConfig, production } from './environments';
import {
  CancelledSigningError,
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TimeoutError,
  TransactionFailedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from './errors';
import { buildHmacSignature } from './hmac';
import { parseUserInput } from './input';
import { JsonRpcClient } from './rpc';
import type { ServiceRequest } from './ServiceClient';
import { ServiceClient } from './ServiceClient';
import type { ApiKeyAuthorization, Signer } from './types';
import {
  ClobMarketWebSocketManager,
  ClobUserWebSocketManager,
  type PublicWebSocketManagers,
  RtdsWebSocketManager,
  type SecureWebSocketManagers,
  SportsWebSocketManager,
} from './websockets';
import {
  type AuthenticationWorkflow,
  authenticateWith,
  requestAddress,
} from './workflow';

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
  rpc: JsonRpcClient;
  /** @internal */
  gamma: ServiceClient;
  /** @internal */
  data: ServiceClient;
  /** @internal */
  webSockets: PublicWebSocketManagers;
};

// biome-ignore lint/complexity/noBannedTypes: intentional
export type ClientActions = {};

export type ClientDecorator<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
> = {
  (client: BasePublicClient<ClientActions, ClientActions>): TPublicActions;
  (client: BaseSecureClient<ClientActions, ClientActions>): TSecureActions;
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
  get rpc(): JsonRpcClient {
    return this.context.rpc;
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
  get webSockets(): PublicWebSocketManagers {
    return this.context.webSockets;
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

export type BeginAuthenticationRequest = {
  /**
   * Wallet address to authenticate as.
   *
   * Pass the signer address itself to authenticate as an EOA account.
   */
  wallet: string;

  /**
   * Nonce used when creating or deriving fresh credentials.
   *
   * Mutually exclusive with `credentials`.
   *
   * @defaultValue 0
   */
  nonce?: number;

  /**
   * Existing API credentials to reuse when they remain valid.
   *
   * If these credentials are revoked or invalid, authentication falls back to
   * fresh authentication and the signer may be asked to sign again.
   */
  credentials?: ApiKeyCreds;
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
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
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
      rpc: new JsonRpcClient({ url: config.environment.rpc }),
      webSockets: {
        clobMarket: new ClobMarketWebSocketManager({
          url: config.environment.clobMarketWs,
        }),
        sports: new SportsWebSocketManager({
          url: config.environment.sportsWs,
        }),
        rtds: new RtdsWebSocketManager(config.environment.rtdsWs),
      },
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
  isSecureClient(): this is BaseSecureClient<TPublicActions, TSecureActions> {
    return false;
  }

  /**
   * Use this to narrow a {@link Client} union to {@link PublicClient}.
   *
   * @example
   * ```ts
   * if (client.isPublicClient()) {
   *   client.closeSubscriptions(); // PublicClient
   * }
   * ```
   */
  isPublicClient(): this is BasePublicClient<TPublicActions, TSecureActions> {
    return true;
  }

  /**
   * Closes all active realtime subscriptions owned by this client.
   *
   * @remarks
   * This ends active subscription iterators and closes shared websocket
   * connections. It does not affect authentication or other client state.
   *
   * @example
   * ```ts
   * await client.closeSubscriptions();
   * ```
   */
  async closeSubscriptions(): Promise<void> {
    await Promise.all([
      this.webSockets.clobMarket.close(),
      this.webSockets.rtds.close(),
      this.webSockets.sports.close(),
    ]).then(() => undefined);
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
   *
   * @remarks
   * This is a low-level method for building wallet-interactive workflows. Most
   * applications should use {@link createSecureClient} instead.
   *
   * @internal
   */
  beginAuthentication(
    request: BeginAuthenticationRequest,
    signer?: Signer,
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
        const signerAddress = expectEvmAddress(yield requestAddress());
        const wallet = expectEvmAddress(params.wallet);
        const identity = resolveAccountIdentity(
          this.environment,
          signerAddress,
          wallet,
        );

        if (params.credentials !== undefined) {
          const client = this.#createSecureClient(
            params.credentials,
            identity,
            signer,
          );

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
            address: signerAddress,
            chainId: this.environment.chainId,
            nonce,
            timestamp,
          }),
        };
        const credentials = await createOrDeriveApiKey(this, {
          address: signerAddress,
          nonce,
          signature: expectEvmSignature(signature),
          timestamp,
        });

        return this.#createSecureClient(credentials, identity, signer);
      }.call(this as unknown as PublicClient<TPublicActions, TSecureActions>),
    );
  }

  #createSecureClient(
    credentials: ApiKeyCreds,
    account: AccountIdentity,
    signer?: Signer,
  ): SecureClient<TPublicActions, TSecureActions> {
    const client = new BaseSecureClient({
      account: account,
      apiKey: this.context.apiKey,
      credentials,
      environment: this.environment,
      signer,
    });

    for (const decorator of this.decorators) {
      client.extend(decorator);
    }

    return client as SecureClient<TPublicActions, TSecureActions>;
  }
}

class BaseSecureClient<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
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
      signer: config.signer,
      clob: new ServiceClient({
        root: config.environment.clob,
        resolveHeaders: (request) => this.resolveClobHeaders(request),
      }),
      relayer: new ServiceClient({
        root: config.environment.relayer,
        resolveHeaders: (request) => this.resolveRelayerHeaders(request),
      }),
      rpc: new JsonRpcClient({ url: config.environment.rpc }),
      gamma: new ServiceClient({ root: config.environment.gamma }),
      data: new ServiceClient({ root: config.environment.data }),
      secureClob: new ServiceClient({
        resolveHeaders: async (request) => ({
          ...(await this.resolveClobHeaders(request)),
          ...(await this.#createL2Headers(request)),
        }),
        root: config.environment.clob,
      }),
      webSockets: {
        clobMarket: new ClobMarketWebSocketManager({
          url: config.environment.clobMarketWs,
        }),
        clobUser: new ClobUserWebSocketManager({
          resolveCredentials: () => this.credentials,
          url: config.environment.clobUserWs,
        }),
        sports: new SportsWebSocketManager({
          url: config.environment.sportsWs,
        }),
        rtds: new RtdsWebSocketManager(config.environment.rtdsWs),
      },
    });
  }

  /**
   * API credentials for the authenticated session.
   *
   * @remarks
   * These credentials are sensitive. Store them securely if you want to create
   * another secure client later without requiring a new authentication signature
   * while the credentials remain valid.
   */
  get credentials(): ApiKeyCreds {
    return this.context.credentials;
  }

  /**
   * The authenticated account identity associated with this client, including the signer and wallet addresses and wallet type.
   */
  get account(): AccountIdentity {
    return this.context.account;
  }

  /** @internal */
  get signer(): Signer {
    invariant(
      this.context.signer !== undefined,
      'Secure client does not have a signer. Create secure clients with createSecureClient to use wallet-interactive methods.',
    );

    return this.context.signer;
  }

  /**
   * Sets up a gasless wallet and returns a secure client bound to it.
   *
   * @remarks
   * If this client is already bound to a gasless wallet, this returns a secure
   * client for the current wallet. For EOA clients, this deploys or reuses the
   * authenticated signer's deterministic Deposit Wallet.
   *
   * @throws {@link SetupGaslessWalletError}
   * Thrown on failure.
   */
  async setupGaslessWallet(): Promise<
    SecureClient<TPublicActions, TSecureActions>
  > {
    const signerAddress = expectEvmAddress(await this.signer.getAddress());

    invariant(
      isSameEvmAddress(signerAddress, this.account.signer),
      'The current signer address does not match the authenticated signer for this client.',
    );

    if (this.account.walletType !== WalletType.EOA) {
      return this.#createSecureClientForWallet(
        this.account.wallet,
        signerAddress,
      );
    }

    const depositWallet = deriveUupsDepositWalletAddress(
      signerAddress,
      this.environment.walletDerivation,
    );

    if (
      await isGaslessReady(this, {
        wallet: depositWallet,
        type: WalletType.DEPOSIT_WALLET,
      })
    ) {
      return this.#createSecureClientForWallet(depositWallet, signerAddress);
    }

    const handle = await deployDepositWallet(this);
    await handle.wait();

    return this.#createSecureClientForWallet(depositWallet, signerAddress);
  }

  #createSecureClientForWallet(
    wallet: AccountIdentity['wallet'],
    signerAddress: AccountIdentity['signer'],
  ): SecureClient<TPublicActions, TSecureActions> {
    const client = new BaseSecureClient<TPublicActions, TSecureActions>({
      account: resolveAccountIdentity(this.environment, signerAddress, wallet),
      apiKey: this.context.apiKey,
      credentials: this.credentials,
      environment: this.environment,
      signer: this.context.signer,
    });

    for (const decorator of this.decorators) {
      client.extend(decorator);
    }

    return client as SecureClient<TPublicActions, TSecureActions>;
  }

  /** @internal */
  get secureClob(): ServiceClient {
    return this.context.secureClob;
  }

  /** @internal */
  override get webSockets(): SecureWebSocketManagers {
    return this.context.webSockets;
  }

  /**
   * Closes all active realtime subscriptions owned by this client.
   *
   * @remarks
   * Secure clients also close authenticated user-stream subscriptions. This
   * ends active subscription iterators and closes shared websocket connections.
   * It does not affect authentication or other client state.
   *
   * @example
   * ```ts
   * await client.closeSubscriptions();
   * ```
   */
  async closeSubscriptions(): Promise<void> {
    await Promise.allSettled([
      this.webSockets.clobMarket.close(),
      this.webSockets.rtds.close(),
      this.webSockets.sports.close(),
      this.webSockets.clobUser.close(),
    ]).then(() => undefined);
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
  isSecureClient(): this is BaseSecureClient<TPublicActions, TSecureActions> {
    return true;
  }

  /**
   * Use this to narrow a {@link Client} union to {@link PublicClient}.
   *
   * @example
   * ```ts
   * if (client.isPublicClient()) {
   *   client.closeSubscriptions(); // PublicClient
   * }
   * ```
   */
  isPublicClient(): this is BasePublicClient<TPublicActions, TSecureActions> {
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
    // Server-side revocation must not depend on local WebSocket cleanup.
    const closingSubscriptions = this.closeSubscriptions();
    const { apiKey, environment } = this.context;

    try {
      await deleteApiKey(this);
    } finally {
      this.endAuthenticationLifecycle();
      await closingSubscriptions;
    }

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
  signer?: Signer;
  /** @internal */
  secureClob: ServiceClient;
  /** @internal */
  webSockets: SecureWebSocketManagers;
};

type SecureClientConfig = PublicClientConfig & {
  account: AccountIdentity;
  credentials: ApiKeyCreds;
  signer?: Signer;
};

export type PublicClient<
  TPublicActions extends ClientActions = PublicActions,
  TSecureActions extends ClientActions = SecureActions,
> = BasePublicClient<TPublicActions, TSecureActions> & TPublicActions;

export type SecureClient<
  TPublicActions extends ClientActions = PublicActions,
  TSecureActions extends ClientActions = SecureActions,
> = BaseSecureClient<TPublicActions, TSecureActions> & TSecureActions;

export { BasePublicClient, BaseSecureClient };

export type BaseClient<
  TPublicActions extends ClientActions = ClientActions,
  TSecureActions extends ClientActions = TPublicActions,
> =
  | BasePublicClient<TPublicActions, TSecureActions>
  | BaseSecureClient<TPublicActions, TSecureActions>;

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

export type SecureClientOptions = PublicClientOptions & {
  /**
   * Wallet address to use as the account wallet.
   *
   * If omitted, the client uses the signer address as the account wallet and
   * operates as an EOA account. EOA clients do not use gasless relayer flows:
   * approvals, transfers, and other wallet operations are submitted directly by
   * the signer and require the signer wallet to hold gas. Pass a supported Poly
   * Deposit Wallet, Poly Safe, or Poly Proxy wallet address to use that wallet
   * as the account/funder and enable gasless wallet operations when an API key
   * strategy supports them.
   */
  wallet?: string;

  /**
   * Wallet-library adapter used to authenticate and complete wallet operations.
   */
  signer: Signer;
} & (
    | {
        /**
         * Existing API credentials to reuse when they remain valid.
         */
        credentials?: ApiKeyCreds;
        nonce?: never;
      }
    | {
        credentials?: never;
        /**
         * Nonce used when creating or deriving fresh credentials.
         *
         * @defaultValue 0
         */
        nonce?: number;
      }
  );

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

export type CreateSecureClientError =
  | CancelledSigningError
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const CreateSecureClientError = makeErrorGuard(
  CancelledSigningError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

export type SetupGaslessWalletError =
  | DeployDepositWalletError
  | IsGaslessReadyError
  | SigningError
  | WaitForGaslessTransactionError
  | UserInputError;
export const SetupGaslessWalletError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TimeoutError,
  TransactionFailedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Creates a new authenticated `SecureClient` instance.
 *
 * @example
 * ```ts
 * const secureClient = await createSecureClient({
 *   signer,
 * });
 * ```
 *
 * @throws {@link CreateSecureClientError}
 * Thrown on failure.
 */
export async function createSecureClient(
  options: SecureClientOptions,
): Promise<SecureClient<PublicActions, SecureActions>> {
  const client = createPublicClient({
    environment: options.environment,
    apiKey: options.apiKey,
  });
  const wallet = options.wallet ?? (await options.signer.getAddress());

  return client
    .beginAuthentication(
      {
        wallet,
        credentials: options.credentials,
        nonce: options.nonce,
      },
      options.signer,
    )
    .then(authenticateWith(options.signer));
}
