import { PaginationCursorSchema } from '@polymarket/bindings';
import {
  AssetTypeSchema,
  type BalanceAllowanceResponse,
  BalanceAllowanceResponseSchema,
  type ClobTrade,
  ClobTradesPageSchema,
  ClosedOnlyModeSchema,
  END_CURSOR,
  INITIAL_CURSOR,
  type NotificationsResponse,
  NotificationsResponseSchema,
  type OpenOrder,
  OpenOrderSchema,
  OpenOrdersPageSchema,
  OrderScoringResponseSchema,
  type OrdersScoringResponse,
  OrdersScoringResponseSchema,
  type RewardsPercentages,
  RewardsPercentagesSchema,
  type TotalUserEarning,
  TotalUserEarningsResponseSchema,
  type UserEarning,
  UserEarningsPageSchema,
  type UserRewardsEarning,
  UserRewardsEarningsPageSchema,
} from '@polymarket/bindings/clob';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { toSignatureType } from '../account';
import type { SecureClient } from '../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

export type FetchClosedOnlyModeError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Fetches whether the account is restricted to closed-only trading.
 *
 * @throws {@link FetchClosedOnlyModeError}
 */
export async function fetchClosedOnlyMode(
  client: SecureClient,
): Promise<boolean> {
  const response = await unwrap(
    client.secureClob
      .get('/auth/ban-status/closed-only')
      .andThen(validateWith(ClosedOnlyModeSchema)),
  );

  return response.closed_only;
}

const FetchOpenOrdersRequestSchema = z
  .object({
    assetId: z.string().optional(),
    id: z.string().optional(),
    market: z.string().optional(),
  })
  .default({});

export type FetchOpenOrdersRequest = z.input<
  typeof FetchOpenOrdersRequestSchema
>;
export type FetchOpenOrdersError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches open orders for the authenticated account across all pages.
 *
 * @throws {@link FetchOpenOrdersError}
 */
export async function fetchOpenOrders(
  client: SecureClient,
  request?: FetchOpenOrdersRequest,
): Promise<OpenOrder[]> {
  const params = parseUserInput(request, FetchOpenOrdersRequestSchema);

  return listAllPages(async (nextCursor) =>
    unwrap(
      client.secureClob
        .get('/data/orders', {
          params: toSearchParams({ ...params, nextCursor }, snakeCase()),
        })
        .andThen(validateWith(OpenOrdersPageSchema)),
    ),
  );
}

const FetchOrderRequestSchema = z.object({
  orderId: z.string(),
});

export type FetchOrderRequest = z.input<typeof FetchOrderRequestSchema>;
export type FetchOrderError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches a single order for the authenticated account.
 *
 * @throws {@link FetchOrderError}
 */
export async function fetchOrder(
  client: SecureClient,
  request: FetchOrderRequest,
): Promise<OpenOrder> {
  const params = parseUserInput(request, FetchOrderRequestSchema);

  return unwrap(
    client.secureClob
      .get(`/data/order/${params.orderId}`)
      .andThen(validateWith(OpenOrderSchema)),
  );
}

const FetchTradesRequestFields = {
  after: z.string().optional(),
  assetId: z.string().optional(),
  before: z.string().optional(),
  id: z.string().optional(),
  makerAddress: z.string().optional(),
  market: z.string().optional(),
};

const FetchTradesRequestSchema = z.object(FetchTradesRequestFields).default({});

export type FetchTradesRequest = z.input<typeof FetchTradesRequestSchema>;
export type FetchTradesError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches trades for the authenticated account across all pages.
 *
 * @throws {@link FetchTradesError}
 */
export async function fetchTrades(
  client: SecureClient,
  request?: FetchTradesRequest,
): Promise<ClobTrade[]> {
  const params = parseUserInput(request, FetchTradesRequestSchema);

  return listAllPages(async (nextCursor) =>
    unwrap(
      client.secureClob
        .get('/data/trades', {
          params: toSearchParams({ ...params, nextCursor }, snakeCase()),
        })
        .andThen(validateWith(ClobTradesPageSchema)),
    ),
  );
}

const FetchTradesPaginatedRequestSchema = z
  .object({
    ...FetchTradesRequestFields,
    nextCursor: PaginationCursorSchema.optional(),
  })
  .default({});

export type FetchTradesPaginatedRequest = z.input<
  typeof FetchTradesPaginatedRequestSchema
>;

export type FetchTradesPaginatedResponse = {
  count: number;
  limit: number;
  nextCursor: string;
  trades: ClobTrade[];
};

export type FetchTradesPaginatedError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches a single page of trades for the authenticated account.
 *
 * @throws {@link FetchTradesPaginatedError}
 */
export async function fetchTradesPaginated(
  client: SecureClient,
  request?: FetchTradesPaginatedRequest,
): Promise<FetchTradesPaginatedResponse> {
  const params = parseUserInput(request, FetchTradesPaginatedRequestSchema);
  const response = await unwrap(
    client.secureClob
      .get('/data/trades', {
        params: toSearchParams(
          {
            ...params,
            nextCursor: params.nextCursor ?? INITIAL_CURSOR,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(ClobTradesPageSchema)),
  );

  return {
    count: response.count,
    limit: response.limit,
    nextCursor: response.next_cursor,
    trades: response.data,
  };
}

export type FetchNotificationsError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

const DropNotificationsRequestSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type DropNotificationsRequest = z.input<
  typeof DropNotificationsRequestSchema
>;

/**
 * Fetches notifications for the authenticated account.
 *
 * @throws {@link FetchNotificationsError}
 */
export async function fetchNotifications(
  client: SecureClient,
): Promise<NotificationsResponse> {
  const signatureType = toSignatureType(client.account.walletType);

  return unwrap(
    client.secureClob
      .get('/notifications', {
        params: toSearchParams({ signatureType }, snakeCase()),
      })
      .andThen(validateWith(NotificationsResponseSchema)),
  );
}

export type DropNotificationsError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Drops notifications for the authenticated account.
 *
 * @throws {@link DropNotificationsError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * await dropNotifications(client, {
 *   ids: ['1', '2'],
 * });
 * ```
 */
export async function dropNotifications(
  client: SecureClient,
  request: DropNotificationsRequest,
): Promise<void> {
  const params = parseUserInput(request, DropNotificationsRequestSchema);
  const signatureType = toSignatureType(client.account.walletType);
  const searchParams = toSearchParams(
    {
      ids: params.ids.join(','),
      signatureType,
    },
    snakeCase(),
  );

  await unwrap(
    client.secureClob.del('/notifications', {
      params: searchParams,
    }),
  );
}

const FetchBalanceAllowanceRequestSchema = z.object({
  assetType: AssetTypeSchema,
  tokenId: z.string().optional(),
});

export type FetchBalanceAllowanceRequest = z.input<
  typeof FetchBalanceAllowanceRequestSchema
>;
export type FetchBalanceAllowanceError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches balance and allowance for the authenticated account.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @throws {@link FetchBalanceAllowanceError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const balanceAllowance = await fetchBalanceAllowance(client, {
 *   assetType: AssetType.COLLATERAL,
 * });
 * ```
 */
export async function fetchBalanceAllowance(
  client: SecureClient,
  request: FetchBalanceAllowanceRequest,
): Promise<BalanceAllowanceResponse> {
  const params = parseUserInput(request, FetchBalanceAllowanceRequestSchema);
  const signatureType = toSignatureType(client.account.walletType);

  return unwrap(
    client.secureClob
      .get('/balance-allowance', {
        params: toSearchParams(
          {
            ...params,
            signatureType,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(BalanceAllowanceResponseSchema)),
  );
}

const FetchOrderScoringRequestSchema = z.object({
  orderId: z.string(),
});

export type FetchOrderScoringRequest = z.input<
  typeof FetchOrderScoringRequestSchema
>;
export type FetchOrderScoringError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches whether a single order is currently scoring.
 *
 * @throws {@link FetchOrderScoringError}
 */
export async function fetchOrderScoring(
  client: SecureClient,
  request: FetchOrderScoringRequest,
): Promise<boolean> {
  const params = parseUserInput(request, FetchOrderScoringRequestSchema);
  const response = await unwrap(
    client.secureClob
      .get('/order-scoring', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(OrderScoringResponseSchema)),
  );

  return response.scoring;
}

const FetchOrdersScoringRequestSchema = z.object({
  orderIds: z.array(z.string()),
});

export type FetchOrdersScoringRequest = z.input<
  typeof FetchOrdersScoringRequestSchema
>;
export type FetchOrdersScoringError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches scoring state for multiple orders.
 *
 * @throws {@link FetchOrdersScoringError}
 */
export async function fetchOrdersScoring(
  client: SecureClient,
  request: FetchOrdersScoringRequest,
): Promise<OrdersScoringResponse> {
  const params = parseUserInput(request, FetchOrdersScoringRequestSchema);
  const body = params.orderIds;

  return unwrap(
    client.secureClob
      .post('/orders-scoring', {
        json: body,
      })
      .andThen(validateWith(OrdersScoringResponseSchema)),
  );
}

const FetchUserEarningsForDayRequestSchema = z.object({
  date: z.string(),
});

export type FetchEarningsForUserForDayRequest = z.input<
  typeof FetchUserEarningsForDayRequestSchema
>;
export type FetchEarningsForUserForDayError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches per-market earnings for the authenticated account on a given day.
 *
 * @throws {@link FetchEarningsForUserForDayError}
 */
export async function fetchEarningsForUserForDay(
  client: SecureClient,
  request: FetchEarningsForUserForDayRequest,
): Promise<UserEarning[]> {
  const params = parseUserInput(request, FetchUserEarningsForDayRequestSchema);
  const signatureType = toSignatureType(client.account.walletType);

  return listAllPages(async (nextCursor) =>
    unwrap(
      client.secureClob
        .get('/rewards/user', {
          params: toSearchParams(
            {
              ...params,
              nextCursor,
              signatureType,
            },
            snakeCase(),
          ),
        })
        .andThen(validateWith(UserEarningsPageSchema)),
    ),
  );
}

export type FetchTotalEarningsForUserForDayRequest = z.input<
  typeof FetchUserEarningsForDayRequestSchema
>;
export type FetchTotalEarningsForUserForDayError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches total earnings for the authenticated account on a given day.
 *
 * @throws {@link FetchTotalEarningsForUserForDayError}
 */
export async function fetchTotalEarningsForUserForDay(
  client: SecureClient,
  request: FetchTotalEarningsForUserForDayRequest,
): Promise<TotalUserEarning[]> {
  const params = parseUserInput(request, FetchUserEarningsForDayRequestSchema);
  const signatureType = toSignatureType(client.account.walletType);

  return unwrap(
    client.secureClob
      .get('/rewards/user/total', {
        params: toSearchParams(
          {
            ...params,
            signatureType,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(TotalUserEarningsResponseSchema)),
  );
}

const FetchUserEarningsAndMarketsConfigRequestSchema = z.object({
  date: z.string(),
  noCompetition: z.boolean().optional(),
  orderBy: z.string().optional(),
  position: z.string().optional(),
});

export type FetchUserEarningsAndMarketsConfigRequest = z.input<
  typeof FetchUserEarningsAndMarketsConfigRequestSchema
>;
export type FetchUserEarningsAndMarketsConfigError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches market reward configuration and earnings for the authenticated account on a given day.
 *
 * @throws {@link FetchUserEarningsAndMarketsConfigError}
 */
export async function fetchUserEarningsAndMarketsConfig(
  client: SecureClient,
  request: FetchUserEarningsAndMarketsConfigRequest,
): Promise<UserRewardsEarning[]> {
  const params = parseUserInput(
    request,
    FetchUserEarningsAndMarketsConfigRequestSchema,
  );
  const signatureType = toSignatureType(client.account.walletType);

  return listAllPages(async (nextCursor) =>
    unwrap(
      client.secureClob
        .get('/rewards/user/markets', {
          params: toSearchParams(
            {
              ...params,
              nextCursor,
              signatureType,
            },
            snakeCase(),
          ),
        })
        .andThen(validateWith(UserRewardsEarningsPageSchema)),
    ),
  );
}

export type FetchRewardPercentagesError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Fetches reward percentages for the authenticated account.
 *
 * @throws {@link FetchRewardPercentagesError}
 */
export async function fetchRewardPercentages(
  client: SecureClient,
): Promise<RewardsPercentages> {
  const signatureType = toSignatureType(client.account.walletType);

  return unwrap(
    client.secureClob
      .get('/rewards/user/percentages', {
        params: toSearchParams({ signatureType }, snakeCase()),
      })
      .andThen(validateWith(RewardsPercentagesSchema)),
  );
}

async function listAllPages<TItem>(
  fetchPage: (nextCursor: string) => Promise<{
    data: TItem[];
    next_cursor: string;
  }>,
): Promise<TItem[]> {
  let nextCursor = INITIAL_CURSOR;
  const results: TItem[] = [];

  while (nextCursor !== END_CURSOR) {
    const response = await fetchPage(nextCursor);

    results.push(...response.data);
    nextCursor = response.next_cursor;
  }

  return results;
}
