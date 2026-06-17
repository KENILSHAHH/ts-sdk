import {
  FetchPerpsCandlesResponseSchema,
  FetchPerpsFeesResponseSchema,
  FetchPerpsFundingHistoryResponseSchema,
  FetchPerpsInstrumentsResponseSchema,
  FetchPerpsStatisticsResponseSchema,
  FetchPerpsTickersResponseSchema,
  FetchPerpsTradesResponseSchema,
  type PerpsBook,
  type PerpsCandle,
  type PerpsCredentials,
  type PerpsFeeScheduleEntry,
  type PerpsFundingRate,
  type PerpsInstrument,
  PerpsInstrumentCategorySchema,
  PerpsInstrumentIdSchema,
  PerpsInstrumentTypeSchema,
  PerpsKlineIntervalSchema,
  type PerpsPublicTrade,
  type PerpsTicker,
  RawPerpsBookSchema,
  RawPerpsCreateProxyResponseSchema,
  RawPerpsCredentialsResponseSchema,
} from '@polymarket/bindings/perps';
import {
  expectEvmAddress,
  invariant,
  isPrivateKey,
  isSameEvmAddress,
  type PrivateKey,
  unwrap,
} from '@polymarket/types';
import { Address, Secp256k1 } from 'ox';
import { z } from 'zod';
import type { BaseClient, BaseSecureClient } from '../clients';
import {
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import type { TypedDataPayload } from '../types';
import { snakeCase, toSearchParams } from './params';

type PerpsPublicReadError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

const PerpsPublicReadError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

const TimestampInputSchema = z.number().int().nonnegative();

const FetchPerpsInstrumentsRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema.optional(),
    instrumentType: PerpsInstrumentTypeSchema.optional(),
    category: PerpsInstrumentCategorySchema.optional(),
  })
  .default({});

export type FetchPerpsInstrumentsRequest = z.input<
  typeof FetchPerpsInstrumentsRequestSchema
>;

export type FetchPerpsInstrumentsError = PerpsPublicReadError;
export const FetchPerpsInstrumentsError = PerpsPublicReadError;

/**
 * Fetches Perps instruments.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsInstrumentsError}
 * Thrown on failure.
 */
export async function fetchPerpsInstruments(
  client: BaseClient,
  request?: FetchPerpsInstrumentsRequest,
): Promise<PerpsInstrument[]> {
  const params = parseUserInput(request, FetchPerpsInstrumentsRequestSchema);

  return unwrap(
    client.perps
      .get('/v1/info/instruments', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsInstrumentsResponseSchema)),
  );
}

const FetchPerpsTickerRequestSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
});

export type FetchPerpsTickerRequest = z.input<
  typeof FetchPerpsTickerRequestSchema
>;

export type FetchPerpsTickerError = PerpsPublicReadError;
export const FetchPerpsTickerError = PerpsPublicReadError;

/**
 * Fetches the current Perps ticker for an instrument.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsTickerError}
 * Thrown on failure.
 */
export async function fetchPerpsTicker(
  client: BaseClient,
  request: FetchPerpsTickerRequest,
): Promise<PerpsTicker> {
  const params = parseUserInput(request, FetchPerpsTickerRequestSchema);
  const [ticker] = await fetchPerpsTickers(client, params);

  if (ticker === undefined) {
    throw new UnexpectedResponseError(
      `Perps ticker ${params.instrumentId} was not returned by the API`,
    );
  }

  return ticker;
}

const FetchPerpsTickersRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema.optional(),
  })
  .default({});

export type FetchPerpsTickersRequest = z.input<
  typeof FetchPerpsTickersRequestSchema
>;

export type FetchPerpsTickersError = PerpsPublicReadError;
export const FetchPerpsTickersError = PerpsPublicReadError;

/**
 * Fetches current Perps tickers.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsTickersError}
 * Thrown on failure.
 */
export async function fetchPerpsTickers(
  client: BaseClient,
  request?: FetchPerpsTickersRequest,
): Promise<PerpsTicker[]> {
  const params = parseUserInput(request, FetchPerpsTickersRequestSchema);
  const query = toSearchParams(params, snakeCase());
  const [tickers, statistics] = await Promise.all([
    unwrap(
      client.perps
        .get('/v1/info/tickers', { params: query })
        .andThen(validateWith(FetchPerpsTickersResponseSchema)),
    ),
    unwrap(
      client.perps
        .get('/v1/info/statistics', { params: query })
        .andThen(validateWith(FetchPerpsStatisticsResponseSchema)),
    ),
  ]);
  const statisticsByInstrument = new Map(
    statistics.map((statistic) => [statistic.instrumentId, statistic]),
  );

  return tickers.map((ticker) => {
    const statistic = statisticsByInstrument.get(ticker.instrumentId);

    return {
      ...ticker,
      openPrice: statistic?.openPrice,
      volume24h: statistic?.volume,
    };
  });
}

const FetchPerpsBookRequestSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  depth: z
    .union([z.literal(10), z.literal(100), z.literal(500), z.literal(1000)])
    .optional(),
});

export type FetchPerpsBookRequest = z.input<typeof FetchPerpsBookRequestSchema>;

export type FetchPerpsBookError = PerpsPublicReadError;
export const FetchPerpsBookError = PerpsPublicReadError;

/**
 * Fetches a Perps order book.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsBookError}
 * Thrown on failure.
 */
export async function fetchPerpsBook(
  client: BaseClient,
  request: FetchPerpsBookRequest,
): Promise<PerpsBook> {
  const params = parseUserInput(request, FetchPerpsBookRequestSchema);

  return unwrap(
    client.perps
      .get('/v1/info/book', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(RawPerpsBookSchema)),
  );
}

const FetchPerpsCandlesRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema,
    interval: PerpsKlineIntervalSchema,
    start: TimestampInputSchema.optional(),
    end: TimestampInputSchema.optional(),
  })
  .transform(({ end, start, ...request }) => ({
    ...request,
    endTimestamp: end,
    startTimestamp: start ?? Date.now() - 24 * 60 * 60 * 1000,
  }));

export type FetchPerpsCandlesRequest = z.input<
  typeof FetchPerpsCandlesRequestSchema
>;

export type FetchPerpsCandlesError = PerpsPublicReadError;
export const FetchPerpsCandlesError = PerpsPublicReadError;

/**
 * Fetches Perps candles for an instrument.
 *
 * @remarks
 * Defaults to the past 24 hours when `start` is omitted.
 *
 * @throws {@link FetchPerpsCandlesError}
 * Thrown on failure.
 */
export async function fetchPerpsCandles(
  client: BaseClient,
  request: FetchPerpsCandlesRequest,
): Promise<PerpsCandle[]> {
  const params = parseUserInput(request, FetchPerpsCandlesRequestSchema);

  const response = await unwrap(
    client.perps
      .get('/v1/info/klines', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsCandlesResponseSchema)),
  );

  return response.data;
}

const TimeRangePerpsRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema,
    start: TimestampInputSchema.optional(),
    end: TimestampInputSchema.optional(),
  })
  .transform(({ end, start, ...request }) => ({
    ...request,
    endTimestamp: end,
    startTimestamp: start,
  }));

export type FetchPerpsFundingHistoryRequest = z.input<
  typeof TimeRangePerpsRequestSchema
>;

export type FetchPerpsFundingHistoryError = PerpsPublicReadError;
export const FetchPerpsFundingHistoryError = PerpsPublicReadError;

/**
 * Fetches Perps funding-rate history for an instrument.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsFundingHistoryError}
 * Thrown on failure.
 */
export async function fetchPerpsFundingHistory(
  client: BaseClient,
  request: FetchPerpsFundingHistoryRequest,
): Promise<PerpsFundingRate[]> {
  const params = parseUserInput(request, TimeRangePerpsRequestSchema);

  const response = await unwrap(
    client.perps
      .get('/v1/info/funding', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsFundingHistoryResponseSchema)),
  );

  return response.data;
}

export type FetchPerpsTradesRequest = z.input<
  typeof TimeRangePerpsRequestSchema
>;

export type FetchPerpsTradesError = PerpsPublicReadError;
export const FetchPerpsTradesError = PerpsPublicReadError;

/**
 * Fetches recent Perps trades for an instrument.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsTradesError}
 * Thrown on failure.
 */
export async function fetchPerpsTrades(
  client: BaseClient,
  request: FetchPerpsTradesRequest,
): Promise<PerpsPublicTrade[]> {
  const params = parseUserInput(request, TimeRangePerpsRequestSchema);

  const response = await unwrap(
    client.perps
      .get('/v1/info/trades', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsTradesResponseSchema)),
  );

  return response.data;
}

export type FetchPerpsFeesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;
export const FetchPerpsFeesError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Fetches the Perps fee schedule.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsFeesError}
 * Thrown on failure.
 */
export async function fetchPerpsFees(
  client: BaseClient,
): Promise<PerpsFeeScheduleEntry[]> {
  const response = await unwrap(
    client.perps
      .get('/v1/info/fees')
      .andThen(validateWith(FetchPerpsFeesResponseSchema)),
  );

  return response.feeSchedule;
}

const PrivateKeySchema = z.custom<PrivateKey>(
  (value) => isPrivateKey(value),
  'Expected a hex-encoded 32-byte private key.',
);

const PerpsCredentialsSchema = z.object({
  proxy: z.string().transform((value) => expectEvmAddress(value)),
  privateKey: PrivateKeySchema,
  secret: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

const CreatePerpsSessionRequestSchema = z.object({
  expiresIn: z.number().int().positive(),
  label: z.string().min(1).optional(),
});

const ResumePerpsSessionRequestSchema = z.object({
  credentials: PerpsCredentialsSchema,
});

const OpenPerpsSessionRequestSchema = z.union([
  CreatePerpsSessionRequestSchema,
  ResumePerpsSessionRequestSchema,
]);

export type CreatePerpsSessionRequest = z.input<
  typeof CreatePerpsSessionRequestSchema
>;

export type ResumePerpsSessionRequest = z.input<
  typeof ResumePerpsSessionRequestSchema
>;

export type OpenPerpsSessionRequest =
  | CreatePerpsSessionRequest
  | ResumePerpsSessionRequest;

export type PerpsSession = {
  /** Credentials for resuming this Perps session later. */
  readonly credentials: PerpsCredentials;

  /** Closes the session. Private streams are added in a later Perps session action. */
  close(): Promise<void>;
};

export type OpenPerpsSessionError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const OpenPerpsSessionError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Opens a Perps account session.
 *
 * @remarks
 * Pass `expiresIn` to create new delegated Perps credentials, or pass existing
 * credentials to validate and resume a previous session.
 *
 * @throws {@link OpenPerpsSessionError}
 * Thrown on failure.
 */
export async function openPerpsSession(
  client: BaseSecureClient,
  request: OpenPerpsSessionRequest,
): Promise<PerpsSession> {
  const params = parseUserInput(request, OpenPerpsSessionRequestSchema);
  const credentials =
    'credentials' in params
      ? await resumePerpsCredentials(client, params.credentials)
      : await createPerpsCredentials(client, params);

  return {
    credentials,
    close: () => Promise.resolve(),
  };
}

async function createPerpsCredentials(
  client: BaseSecureClient,
  request: CreatePerpsSessionRequest,
): Promise<PerpsCredentials> {
  const privateKey = createPerpsProxyPrivateKey();
  const proxy = addressFromPrivateKey(privateKey);
  const owner = client.account.signer;
  const expiresAt = Date.now() + request.expiresIn;
  const timestamp = Date.now();
  const salt = randomUint32();
  const op = {
    args: {
      expiry: expiresAt,
      owner,
      proxy,
    },
    type: 'createProxy' as const,
  };
  const signature = await signPerpsCreateProxy(client, {
    expiresAt,
    proxy,
    salt,
    timestamp,
  });
  const body: Record<string, unknown> = {
    op,
    salt,
    sig: signature,
    ts: timestamp,
  };
  if (request.label !== undefined) body.label = request.label;

  const response = await unwrap(
    client.perps
      .post('/v1/account/proxy', { json: body })
      .andThen(validateWith(RawPerpsCreateProxyResponseSchema)),
  );
  const credentials = {
    expiresAt,
    privateKey,
    proxy,
    secret: response.secret,
  };

  return validatePerpsCredentials(client, credentials);
}

async function resumePerpsCredentials(
  client: BaseSecureClient,
  credentials: PerpsCredentials,
): Promise<PerpsCredentials> {
  assertPerpsCredentialsKeyMatchesProxy(credentials);
  return validatePerpsCredentials(client, credentials);
}

async function validatePerpsCredentials(
  client: BaseSecureClient,
  credentials: PerpsCredentials,
): Promise<PerpsCredentials> {
  const response = await unwrap(
    client.perps
      .get('/v1/account/credentials', {
        headers: perpsCredentialHeaders(credentials),
      })
      .andThen(validateWith(RawPerpsCredentialsResponseSchema)),
  );

  if (!isSameEvmAddress(response.address, client.account.signer)) {
    throw new UnexpectedResponseError(
      'Perps credentials belong to a different signer account.',
    );
  }

  const proxyKey = response.keys.find((key) =>
    isSameEvmAddress(key.proxy, credentials.proxy),
  );
  if (proxyKey === undefined) {
    throw new UnexpectedResponseError(
      'Perps credentials were not returned by the API.',
    );
  }
  if (proxyKey.expiresAt <= Date.now()) {
    throw new UnexpectedResponseError('Perps credentials are expired.');
  }

  return {
    ...credentials,
    expiresAt: proxyKey.expiresAt,
  };
}

type PerpsCreateProxySignatureRequest = {
  expiresAt: number;
  proxy: PerpsCredentials['proxy'];
  salt: number;
  timestamp: number;
};

async function signPerpsCreateProxy(
  client: BaseSecureClient,
  request: PerpsCreateProxySignatureRequest,
) {
  try {
    return await client.signer.signTypedData(
      createPerpsCreateProxyTypedDataPayload({
        chainId: client.environment.chainId,
        ...request,
      }),
    );
  } catch (error) {
    throw SigningError.fromError(
      error,
      'Could not sign the Perps proxy credentials request',
    );
  }
}

type CreatePerpsCreateProxyTypedDataPayloadRequest =
  PerpsCreateProxySignatureRequest & {
    chainId: number;
  };

function createPerpsCreateProxyTypedDataPayload(
  request: CreatePerpsCreateProxyTypedDataPayloadRequest,
): TypedDataPayload {
  return {
    domain: {
      chainId: request.chainId,
      name: 'Polymarket',
      version: '1',
    },
    message: {
      addr: request.proxy,
      exp: request.expiresAt,
      salt: request.salt,
      ts: request.timestamp,
    },
    primaryType: 'CreateProxy',
    types: {
      CreateProxy: [
        { name: 'addr', type: 'address' },
        { name: 'exp', type: 'uint64' },
        { name: 'salt', type: 'uint64' },
        { name: 'ts', type: 'uint64' },
      ],
    },
  };
}

function createPerpsProxyPrivateKey(): PrivateKey {
  const privateKey = Secp256k1.randomPrivateKey();
  invariant(isPrivateKey(privateKey), 'Generated invalid Perps proxy key.');
  return privateKey;
}

function addressFromPrivateKey(privateKey: PrivateKey) {
  return expectEvmAddress(
    Address.fromPublicKey(Secp256k1.getPublicKey({ privateKey })),
  );
}

function assertPerpsCredentialsKeyMatchesProxy(
  credentials: PerpsCredentials,
): void {
  const privateKeyAddress = addressFromPrivateKey(credentials.privateKey);
  if (!isSameEvmAddress(privateKeyAddress, credentials.proxy)) {
    throw new UserInputError(
      'Perps credentials private key does not match the proxy address.',
    );
  }
}

function perpsCredentialHeaders(
  credentials: Pick<PerpsCredentials, 'proxy' | 'secret'>,
): HeadersInit {
  return {
    'POLYMARKET-PROXY': credentials.proxy,
    'POLYMARKET-SECRET': credentials.secret,
  };
}

function randomUint32(): number {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  invariant(
    value !== undefined,
    'Expected crypto.getRandomValues to return a salt.',
  );
  return value;
}
