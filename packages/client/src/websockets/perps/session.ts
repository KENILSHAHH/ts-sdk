import {
  type PaginationCursor,
  PaginationCursorSchema,
  TxHashSchema,
  toDecimalString,
  toPaginationCursor,
} from '@polymarket/bindings';
import {
  FetchPerpsAccountConfigResponseSchema,
  FetchPerpsBalancesResponseSchema,
  FetchPerpsOpenOrdersResponseSchema,
  FetchPerpsOrdersResponseSchema,
  FetchPerpsPortfolioResponseSchema,
  ListPerpsDepositsResponseSchema,
  ListPerpsEquityHistoryResponseSchema,
  ListPerpsFillsResponseSchema,
  ListPerpsFundingPaymentsResponseSchema,
  ListPerpsPnlHistoryResponseSchema,
  ListPerpsWithdrawalsResponseSchema,
  type PerpsAccountConfig,
  type PerpsAccountFill,
  type PerpsAccountFundingPayment,
  type PerpsBalance,
  PerpsClientOrderIdSchema,
  type PerpsCommandAck,
  PerpsCommandAckSchema,
  type PerpsCredentials,
  PerpsDecimalInputSchema,
  type PerpsDeposit,
  PerpsDepositStatusSchema,
  type PerpsEquityPoint,
  type PerpsInstrumentId,
  PerpsInstrumentIdSchema,
  type PerpsOrder,
  type PerpsOrderCommandAck,
  type PerpsOrderId,
  PerpsOrderIdSchema,
  PerpsPnlIntervalSchema,
  type PerpsPnlPoint,
  type PerpsPortfolio,
  type PerpsTimeInForce,
  PerpsTimeInForceSchema,
  type PerpsWithdrawal,
  PerpsWithdrawalStatusSchema,
  RawPerpsOrderCommandAckSchema,
} from '@polymarket/bindings/perps';
import {
  type PerpsSessionEvent,
  PerpsSessionUpdateEventSchema,
} from '@polymarket/bindings/subscriptions';
import {
  expectPresent,
  invariant,
  setNonBlockingTimeout,
  unwrap,
} from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import { z } from 'zod';
import { snakeCase, toSearchParams } from '../../actions/params';
import { SigningError, TransportError } from '../../errors';
import { parseUserInput } from '../../input';
import { type Page, type Paginated, paginate } from '../../pagination';
import { validateWith } from '../../response';
import { ServiceClient } from '../../ServiceClient';
import { PerpsWebSocketHeartbeat } from '../heartbeat';
import { ReconnectScheduler, WebSocketConnection } from '../lifecycle';
import { type PerpsSignedOp, signPerpsOp } from './signing';

const AUTH_TIMEOUT_MS = 30_000;
const ACK_TIMEOUT_MS = 30_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * ONE_DAY_MS;
const PERPS_SESSION_CHANNELS = [
  'balances',
  'portfolio',
  'orders',
  'fills',
  'funding',
  'deposits',
  'withdrawals',
] as const;

const PerpsResponseEnvelopeSchema = z.object({
  id: z.number().int().positive().optional(),
  data: z.unknown(),
});

const PerpsSessionAckSchema = z
  .union([PerpsCommandAckSchema, z.array(PerpsCommandAckSchema)])
  .transform((response) =>
    Array.isArray(response)
      ? (response.find((item) => item.status === 'err') ?? response[0])
      : response,
  );

const TimestampInputSchema = z.number().int().nonnegative();

type PendingResponse = {
  reject(error: Error): void;
  resolve(value: unknown): void;
  schema: z.ZodType;
};

type RawPerpsOrderInput = readonly [
  PerpsInstrumentId,
  boolean,
  string | undefined,
  string,
  PerpsTimeInForce,
  boolean,
  string | undefined,
];

type PerpsHistoryParams = {
  startTimestamp: number;
  endTimestamp: number;
  instrumentId?: PerpsInstrumentId;
  depositStatus?: z.output<typeof PerpsDepositStatusSchema>;
  withdrawalStatus?: z.output<typeof PerpsWithdrawalStatusSchema>;
  hash?: z.output<typeof TxHashSchema>;
};

type PerpsIntervalHistoryParams = PerpsHistoryParams & {
  interval: z.output<typeof PerpsPnlIntervalSchema>;
};

const PerpsDescendingAccountHistoryKindSchema = z.enum([
  'perpsFills',
  'perpsFundingPayments',
  'perpsDeposits',
  'perpsWithdrawals',
]);

const PerpsAscendingAccountHistoryKindSchema = z.enum([
  'perpsEquityHistory',
  'perpsPnlHistory',
]);

const PerpsDescendingAccountCursorStateSchema = z.object({
  kind: PerpsDescendingAccountHistoryKindSchema,
  startTimestamp: TimestampInputSchema,
  endTimestamp: TimestampInputSchema,
  instrumentId: PerpsInstrumentIdSchema.optional(),
  depositStatus: PerpsDepositStatusSchema.optional(),
  withdrawalStatus: PerpsWithdrawalStatusSchema.optional(),
  hash: TxHashSchema.optional(),
  seenKeys: z.array(z.string()),
});

const PerpsAscendingAccountCursorStateSchema = z.object({
  kind: PerpsAscendingAccountHistoryKindSchema,
  startTimestamp: TimestampInputSchema,
  endTimestamp: TimestampInputSchema,
  interval: PerpsPnlIntervalSchema,
});

type PerpsDescendingAccountCursorState = z.infer<
  typeof PerpsDescendingAccountCursorStateSchema
>;
type PerpsAscendingAccountCursorState = z.infer<
  typeof PerpsAscendingAccountCursorStateSchema
>;

export type { PerpsSessionEvent } from '@polymarket/bindings/subscriptions';

export type PerpsSessionOptions = {
  chainId: number;
  credentials: PerpsCredentials;
  onClose: (session: PerpsSession) => void;
  restUrl: string;
  wsUrl: string;
};

const PerpsOrderInputSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  buy: z.boolean(),
  price: PerpsDecimalInputSchema.optional(),
  quantity: PerpsDecimalInputSchema,
  timeInForce: PerpsTimeInForceSchema,
  postOnly: z.boolean().optional(),
  clientOrderId: PerpsClientOrderIdSchema.optional(),
});

const PlacePerpsOrderRequestSchema = PerpsOrderInputSchema;

const PlacePerpsOrdersRequestSchema = z.object({
  orders: z.array(PerpsOrderInputSchema).min(1),
  expiresAt: z.number().int().positive().optional(),
});

const ModifyPerpsOrderRequestSchema = z.object({
  orderId: PerpsOrderIdSchema,
  order: PerpsOrderInputSchema,
  expiresAt: z.number().int().positive().optional(),
});

const ModifyPerpsOrdersRequestSchema = z.object({
  orders: z
    .array(
      z.object({
        orderId: PerpsOrderIdSchema,
        order: PerpsOrderInputSchema,
      }),
    )
    .min(1),
  expiresAt: z.number().int().positive().optional(),
});

const CancelPerpsOrderRequestSchema = z.union([
  z.object({
    orderId: PerpsOrderIdSchema,
    clientOrderId: z.undefined().optional(),
    expiresAt: z.number().int().positive().optional(),
  }),
  z.object({
    clientOrderId: PerpsClientOrderIdSchema,
    orderId: z.undefined().optional(),
    expiresAt: z.number().int().positive().optional(),
  }),
]);

const CancelPerpsOrdersRequestSchema = z.union([
  z.object({
    orderIds: z.array(PerpsOrderIdSchema).min(1),
    clientOrderIds: z.undefined().optional(),
    expiresAt: z.number().int().positive().optional(),
  }),
  z.object({
    clientOrderIds: z.array(PerpsClientOrderIdSchema).min(1),
    orderIds: z.undefined().optional(),
    expiresAt: z.number().int().positive().optional(),
  }),
]);

const UpdatePerpsLeverageRequestSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  leverage: z.number().int().positive(),
  crossMargin: z.boolean(),
});

const UpdatePerpsMarginRequestSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  amount: PerpsDecimalInputSchema,
});

const FetchPerpsAccountConfigRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema.optional(),
  })
  .default({});

const FetchPerpsOpenOrdersRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema.optional(),
  })
  .default({});

const FetchPerpsOrdersRequestSchema = z
  .object({
    orderId: PerpsOrderIdSchema.optional(),
    clientOrderId: PerpsClientOrderIdSchema.optional(),
    instrumentId: PerpsInstrumentIdSchema.optional(),
    start: TimestampInputSchema.optional(),
    end: TimestampInputSchema.optional(),
  })
  .default({})
  .transform(({ end, start, ...request }) => ({
    ...request,
    endTimestamp: end,
    startTimestamp: start,
  }));

const PerpsHistoryRequestBaseSchema = z.object({
  start: TimestampInputSchema.optional(),
  end: TimestampInputSchema.optional(),
});

const ListPerpsFillsRequestSchema = z.union([
  PerpsHistoryRequestBaseSchema.extend({
    cursor: PaginationCursorSchema.optional(),
  }).transform(({ cursor, ...request }) => ({
    cursor,
    params: toPerpsHistoryParams(request, ONE_DAY_MS),
  })),
  z.object({ cursor: PaginationCursorSchema }).transform(({ cursor }) => ({
    cursor,
    params: undefined,
  })),
]);

const ListPerpsFundingPaymentsRequestSchema = z.union([
  PerpsHistoryRequestBaseSchema.extend({
    cursor: PaginationCursorSchema.optional(),
    instrumentId: PerpsInstrumentIdSchema.optional(),
  }).transform(({ cursor, ...request }) => ({
    cursor,
    params: toPerpsHistoryParams(request, ONE_DAY_MS),
  })),
  z.object({ cursor: PaginationCursorSchema }).transform(({ cursor }) => ({
    cursor,
    params: undefined,
  })),
]);

const ListPerpsDepositsRequestSchema = z.union([
  PerpsHistoryRequestBaseSchema.extend({
    cursor: PaginationCursorSchema.optional(),
    depositStatus: PerpsDepositStatusSchema.optional(),
    hash: TxHashSchema.optional(),
  }).transform(({ cursor, ...request }) => ({
    cursor,
    params: toPerpsHistoryParams(request, NINETY_DAYS_MS),
  })),
  z.object({ cursor: PaginationCursorSchema }).transform(({ cursor }) => ({
    cursor,
    params: undefined,
  })),
]);

const ListPerpsWithdrawalsRequestSchema = z.union([
  PerpsHistoryRequestBaseSchema.extend({
    cursor: PaginationCursorSchema.optional(),
    withdrawalStatus: PerpsWithdrawalStatusSchema.optional(),
    hash: TxHashSchema.optional(),
  }).transform(({ cursor, ...request }) => ({
    cursor,
    params: toPerpsHistoryParams(request, NINETY_DAYS_MS),
  })),
  z.object({ cursor: PaginationCursorSchema }).transform(({ cursor }) => ({
    cursor,
    params: undefined,
  })),
]);

const PerpsIntervalHistoryRequestBaseSchema = z.object({
  interval: PerpsPnlIntervalSchema,
  start: TimestampInputSchema,
  end: TimestampInputSchema.optional(),
});

const ListPerpsEquityHistoryRequestSchema = z.union([
  PerpsIntervalHistoryRequestBaseSchema.extend({
    cursor: PaginationCursorSchema.optional(),
  }).transform(({ cursor, ...request }) => ({
    cursor,
    params: toPerpsIntervalHistoryParams(request),
  })),
  z.object({ cursor: PaginationCursorSchema }).transform(({ cursor }) => ({
    cursor,
    params: undefined,
  })),
]);

const ListPerpsPnlHistoryRequestSchema = z.union([
  PerpsIntervalHistoryRequestBaseSchema.extend({
    cursor: PaginationCursorSchema.optional(),
  }).transform(({ cursor, ...request }) => ({
    cursor,
    params: toPerpsIntervalHistoryParams(request),
  })),
  z.object({ cursor: PaginationCursorSchema }).transform(({ cursor }) => ({
    cursor,
    params: undefined,
  })),
]);

export type PlacePerpsOrderRequest = z.input<
  typeof PlacePerpsOrderRequestSchema
>;
export type PlacePerpsOrdersRequest = z.input<
  typeof PlacePerpsOrdersRequestSchema
>;
export type ModifyPerpsOrderRequest = z.input<
  typeof ModifyPerpsOrderRequestSchema
>;
export type ModifyPerpsOrdersRequest = z.input<
  typeof ModifyPerpsOrdersRequestSchema
>;
export type CancelPerpsOrderRequest = z.input<
  typeof CancelPerpsOrderRequestSchema
>;
export type CancelPerpsOrdersRequest = z.input<
  typeof CancelPerpsOrdersRequestSchema
>;
export type UpdatePerpsLeverageRequest = z.input<
  typeof UpdatePerpsLeverageRequestSchema
>;
export type UpdatePerpsMarginRequest = z.input<
  typeof UpdatePerpsMarginRequestSchema
>;
export type FetchPerpsAccountConfigRequest = z.input<
  typeof FetchPerpsAccountConfigRequestSchema
>;
export type FetchPerpsOpenOrdersRequest = z.input<
  typeof FetchPerpsOpenOrdersRequestSchema
>;
export type FetchPerpsOrdersRequest = z.input<
  typeof FetchPerpsOrdersRequestSchema
>;
export type ListPerpsFillsRequest = z.input<typeof ListPerpsFillsRequestSchema>;
export type ListPerpsFundingPaymentsRequest = z.input<
  typeof ListPerpsFundingPaymentsRequestSchema
>;
export type ListPerpsDepositsRequest = z.input<
  typeof ListPerpsDepositsRequestSchema
>;
export type ListPerpsWithdrawalsRequest = z.input<
  typeof ListPerpsWithdrawalsRequestSchema
>;
export type ListPerpsEquityHistoryRequest = z.input<
  typeof ListPerpsEquityHistoryRequestSchema
>;
export type ListPerpsPnlHistoryRequest = z.input<
  typeof ListPerpsPnlHistoryRequestSchema
>;

export class PerpsSession implements AsyncIterable<PerpsSessionEvent> {
  readonly credentials: PerpsCredentials;
  readonly #api: ServiceClient;
  readonly #chainId: number;
  readonly #onClose: (session: PerpsSession) => void;
  readonly #wsUrl: string;
  readonly #connection = new WebSocketConnection({
    heartbeat: new PerpsWebSocketHeartbeat(),
  });
  readonly #queue: Pushable<PerpsSessionEvent> = pushable({ objectMode: true });
  readonly #pending = new Map<number, PendingResponse>();
  readonly #reconnectScheduler = new ReconnectScheduler();
  readonly #sequences = new Map<string, number>();
  readonly #lastDedupedPayload = new Map<string, string>();
  #nextRequestId = 1;
  #closing: Promise<void> | undefined;

  constructor(options: PerpsSessionOptions) {
    this.#api = new ServiceClient({
      resolveHeaders: async () => this.#authenticatedHeaders(),
      root: options.restUrl,
    });
    this.#chainId = options.chainId;
    this.credentials = options.credentials;
    this.#onClose = options.onClose;
    this.#wsUrl = options.wsUrl;
  }

  get closed(): boolean {
    return this.#closing !== undefined;
  }

  async connect(): Promise<void> {
    await this.#connect(false);
  }

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown();
    }
    await this.#closing;
  }

  [Symbol.asyncIterator](): AsyncIterator<PerpsSessionEvent> {
    return this.#queue[Symbol.asyncIterator]();
  }

  async fetchBalances(): Promise<PerpsBalance[]> {
    return await unwrap(
      this.#api
        .get('/v1/account/balances')
        .andThen(validateWith(FetchPerpsBalancesResponseSchema)),
    );
  }

  async fetchPortfolio(): Promise<PerpsPortfolio> {
    return await unwrap(
      this.#api
        .get('/v1/account/portfolio')
        .andThen(validateWith(FetchPerpsPortfolioResponseSchema)),
    );
  }

  async fetchAccountConfig(
    request?: FetchPerpsAccountConfigRequest,
  ): Promise<PerpsAccountConfig[]> {
    const params = parseUserInput(
      request,
      FetchPerpsAccountConfigRequestSchema,
    );
    return await unwrap(
      this.#api
        .get('/v1/account/config', {
          params: toPerpsSearchParams(params),
        })
        .andThen(validateWith(FetchPerpsAccountConfigResponseSchema)),
    );
  }

  async fetchOpenOrders(
    request?: FetchPerpsOpenOrdersRequest,
  ): Promise<PerpsOrder[]> {
    const params = parseUserInput(request, FetchPerpsOpenOrdersRequestSchema);
    return await unwrap(
      this.#api
        .get('/v1/account/open-orders', {
          params: toPerpsSearchParams(params),
        })
        .andThen(validateWith(FetchPerpsOpenOrdersResponseSchema)),
    );
  }

  async fetchOrders(request?: FetchPerpsOrdersRequest): Promise<PerpsOrder[]> {
    const params = parseUserInput(request, FetchPerpsOrdersRequestSchema);
    return await unwrap(
      this.#api
        .get('/v1/account/orders', {
          params: toPerpsSearchParams(params),
        })
        .andThen(validateWith(FetchPerpsOrdersResponseSchema)),
    );
  }

  listFills(
    request: ListPerpsFillsRequest = {},
  ): Paginated<PerpsAccountFill[]> {
    const { cursor, params } = parseUserInput(
      request,
      ListPerpsFillsRequestSchema,
    );
    return paginate((pageCursor) => {
      let state: PerpsDescendingAccountCursorState;
      if (pageCursor === undefined) {
        invariant(params !== undefined, 'Expected initial Perps fills params.');
        state = { kind: 'perpsFills', seenKeys: [], ...params };
      } else {
        state = decodePerpsAccountCursor(
          pageCursor,
          PerpsDescendingAccountCursorStateSchema,
        );
      }
      const { kind: _kind, seenKeys: _seenKeys, ...searchParams } = state;
      const seenKeys = new Set(state.seenKeys);

      return this.#api
        .get('/v1/account/fills', {
          params: toPerpsSearchParams(searchParams),
        })
        .andThen(validateWith(ListPerpsFillsResponseSchema))
        .map((response): Page<PerpsAccountFill[]> => {
          const items = response.data.filter(
            (fill) => !seenKeys.has(String(fill.tradeId)),
          );
          const last = items.at(-1);
          const hasMore =
            response.more &&
            last !== undefined &&
            last.timestamp > state.startTimestamp;

          if (!hasMore) return { items, hasMore };

          const seen = new Set(
            state.endTimestamp === last.timestamp ? state.seenKeys : [],
          );
          for (const fill of items) {
            if (fill.timestamp === last.timestamp)
              seen.add(String(fill.tradeId));
          }

          return {
            items,
            hasMore,
            nextCursor: encodePerpsAccountCursor({
              ...state,
              endTimestamp: last.timestamp,
              seenKeys: Array.from(seen),
            }),
          };
        });
    }, cursor);
  }

  listFundingPayments(
    request: ListPerpsFundingPaymentsRequest = {},
  ): Paginated<PerpsAccountFundingPayment[]> {
    const { cursor, params } = parseUserInput(
      request,
      ListPerpsFundingPaymentsRequestSchema,
    );
    return paginate((pageCursor) => {
      let state: PerpsDescendingAccountCursorState;
      if (pageCursor === undefined) {
        invariant(
          params !== undefined,
          'Expected initial Perps funding payment params.',
        );
        state = { kind: 'perpsFundingPayments', seenKeys: [], ...params };
      } else {
        state = decodePerpsAccountCursor(
          pageCursor,
          PerpsDescendingAccountCursorStateSchema,
        );
      }
      const { kind: _kind, seenKeys: _seenKeys, ...searchParams } = state;
      const seenKeys = new Set(state.seenKeys);

      return this.#api
        .get('/v1/account/funding', {
          params: toPerpsSearchParams(searchParams),
        })
        .andThen(validateWith(ListPerpsFundingPaymentsResponseSchema))
        .map((response): Page<PerpsAccountFundingPayment[]> => {
          const items = response.data.filter(
            (payment) =>
              !seenKeys.has(
                `${payment.instrumentId}:${payment.timestamp}:${payment.funding}`,
              ),
          );
          const last = items.at(-1);
          const hasMore =
            response.more &&
            last !== undefined &&
            last.timestamp > state.startTimestamp;

          if (!hasMore) return { items, hasMore };

          const seen = new Set(
            state.endTimestamp === last.timestamp ? state.seenKeys : [],
          );
          for (const payment of items) {
            if (payment.timestamp === last.timestamp) {
              seen.add(
                `${payment.instrumentId}:${payment.timestamp}:${payment.funding}`,
              );
            }
          }

          return {
            items,
            hasMore,
            nextCursor: encodePerpsAccountCursor({
              ...state,
              endTimestamp: last.timestamp,
              seenKeys: Array.from(seen),
            }),
          };
        });
    }, cursor);
  }

  listDeposits(
    request: ListPerpsDepositsRequest = {},
  ): Paginated<PerpsDeposit[]> {
    const { cursor, params } = parseUserInput(
      request,
      ListPerpsDepositsRequestSchema,
    );
    return paginate((pageCursor) => {
      let state: PerpsDescendingAccountCursorState;
      if (pageCursor === undefined) {
        invariant(
          params !== undefined,
          'Expected initial Perps deposit params.',
        );
        state = { kind: 'perpsDeposits', seenKeys: [], ...params };
      } else {
        state = decodePerpsAccountCursor(
          pageCursor,
          PerpsDescendingAccountCursorStateSchema,
        );
      }
      const { kind: _kind, seenKeys: _seenKeys, ...searchParams } = state;
      const seenKeys = new Set(state.seenKeys);

      return this.#api
        .get('/v1/account/deposits', {
          params: toPerpsSearchParams(searchParams),
        })
        .andThen(validateWith(ListPerpsDepositsResponseSchema))
        .map((response): Page<PerpsDeposit[]> => {
          const items = response.data.filter(
            (deposit) => !seenKeys.has(deposit.hash),
          );
          const last = items.at(-1);
          const lastTimestamp =
            last === undefined ? undefined : latestPerpsDepositTimestamp(last);
          const hasMore =
            response.more &&
            lastTimestamp !== undefined &&
            lastTimestamp > state.startTimestamp;

          if (!hasMore) return { items, hasMore };

          const seen = new Set(
            state.endTimestamp === lastTimestamp ? state.seenKeys : [],
          );
          for (const deposit of items) {
            if (latestPerpsDepositTimestamp(deposit) === lastTimestamp) {
              seen.add(deposit.hash);
            }
          }

          return {
            items,
            hasMore,
            nextCursor: encodePerpsAccountCursor({
              ...state,
              endTimestamp: lastTimestamp,
              seenKeys: Array.from(seen),
            }),
          };
        });
    }, cursor);
  }

  listWithdrawals(
    request: ListPerpsWithdrawalsRequest = {},
  ): Paginated<PerpsWithdrawal[]> {
    const { cursor, params } = parseUserInput(
      request,
      ListPerpsWithdrawalsRequestSchema,
    );
    return paginate((pageCursor) => {
      let state: PerpsDescendingAccountCursorState;
      if (pageCursor === undefined) {
        invariant(
          params !== undefined,
          'Expected initial Perps withdrawal params.',
        );
        state = { kind: 'perpsWithdrawals', seenKeys: [], ...params };
      } else {
        state = decodePerpsAccountCursor(
          pageCursor,
          PerpsDescendingAccountCursorStateSchema,
        );
      }
      const { kind: _kind, seenKeys: _seenKeys, ...searchParams } = state;
      const seenKeys = new Set(state.seenKeys);

      return this.#api
        .get('/v1/account/withdrawals', {
          params: toPerpsSearchParams(searchParams),
        })
        .andThen(validateWith(ListPerpsWithdrawalsResponseSchema))
        .map((response): Page<PerpsWithdrawal[]> => {
          const items = response.data.filter(
            (withdrawal) => !seenKeys.has(String(withdrawal.withdrawalId)),
          );
          const last = items.at(-1);
          const lastTimestamp =
            last === undefined
              ? undefined
              : latestPerpsWithdrawalTimestamp(last);
          const hasMore =
            response.more &&
            lastTimestamp !== undefined &&
            lastTimestamp > state.startTimestamp;

          if (!hasMore) return { items, hasMore };

          const seen = new Set(
            state.endTimestamp === lastTimestamp ? state.seenKeys : [],
          );
          for (const withdrawal of items) {
            if (latestPerpsWithdrawalTimestamp(withdrawal) === lastTimestamp) {
              seen.add(String(withdrawal.withdrawalId));
            }
          }

          return {
            items,
            hasMore,
            nextCursor: encodePerpsAccountCursor({
              ...state,
              endTimestamp: lastTimestamp,
              seenKeys: Array.from(seen),
            }),
          };
        });
    }, cursor);
  }

  listEquityHistory(
    request: ListPerpsEquityHistoryRequest,
  ): Paginated<PerpsEquityPoint[]> {
    const { cursor, params } = parseUserInput(
      request,
      ListPerpsEquityHistoryRequestSchema,
    );
    return paginate((pageCursor) => {
      let state: PerpsAscendingAccountCursorState;
      if (pageCursor === undefined) {
        invariant(
          params !== undefined,
          'Expected initial Perps equity history params.',
        );
        state = { kind: 'perpsEquityHistory', ...params };
      } else {
        state = decodePerpsAccountCursor(
          pageCursor,
          PerpsAscendingAccountCursorStateSchema,
        );
      }
      const { kind: _kind, ...searchParams } = state;

      return this.#api
        .get('/v1/account/equity', {
          params: toPerpsSearchParams(searchParams),
        })
        .andThen(validateWith(ListPerpsEquityHistoryResponseSchema))
        .map((response): Page<PerpsEquityPoint[]> => {
          const last = response.data.at(-1);
          const hasMore =
            response.more &&
            last !== undefined &&
            last.timestamp < state.endTimestamp;

          return {
            items: response.data,
            hasMore,
            nextCursor: hasMore
              ? encodePerpsAccountCursor({
                  ...state,
                  startTimestamp:
                    last.timestamp +
                    perpsHistoryIntervalMilliseconds(state.interval),
                })
              : undefined,
          };
        });
    }, cursor);
  }

  listPnlHistory(
    request: ListPerpsPnlHistoryRequest,
  ): Paginated<PerpsPnlPoint[]> {
    const { cursor, params } = parseUserInput(
      request,
      ListPerpsPnlHistoryRequestSchema,
    );
    return paginate((pageCursor) => {
      let state: PerpsAscendingAccountCursorState;
      if (pageCursor === undefined) {
        invariant(
          params !== undefined,
          'Expected initial Perps PnL history params.',
        );
        state = { kind: 'perpsPnlHistory', ...params };
      } else {
        state = decodePerpsAccountCursor(
          pageCursor,
          PerpsAscendingAccountCursorStateSchema,
        );
      }
      const { kind: _kind, ...searchParams } = state;

      return this.#api
        .get('/v1/account/pnl', {
          params: toPerpsSearchParams(searchParams),
        })
        .andThen(validateWith(ListPerpsPnlHistoryResponseSchema))
        .map((response): Page<PerpsPnlPoint[]> => {
          const last = response.data.at(-1);
          const hasMore =
            response.more &&
            last !== undefined &&
            last.timestamp < state.endTimestamp;

          return {
            items: response.data,
            hasMore,
            nextCursor: hasMore
              ? encodePerpsAccountCursor({
                  ...state,
                  startTimestamp:
                    last.timestamp +
                    perpsHistoryIntervalMilliseconds(state.interval),
                })
              : undefined,
          };
        });
    }, cursor);
  }

  async placeOrder(
    request: PlacePerpsOrderRequest,
  ): Promise<PerpsOrderCommandAck> {
    const [ack] = await this.placeOrders({ orders: [request] });
    return expectPresent(ack, 'Expected Perps place order acknowledgement.');
  }

  async placeOrders(
    request: PlacePerpsOrdersRequest,
  ): Promise<PerpsOrderCommandAck[]> {
    const params = parseUserInput(request, PlacePerpsOrdersRequestSchema);
    return await this.#sendSignedWsCommand({
      op: ['createOrders', params.orders.map(toRawPerpsOrder)],
      responseSchema: z.array(RawPerpsOrderCommandAckSchema),
      timeoutMessage: 'Perps place order acknowledgement timed out.',
      expiresAt: params.expiresAt,
    });
  }

  async modifyOrder(
    request: ModifyPerpsOrderRequest,
  ): Promise<PerpsOrderCommandAck> {
    const params = parseUserInput(request, ModifyPerpsOrderRequestSchema);
    const [ack] = await this.modifyOrders({
      orders: [{ orderId: params.orderId, order: params.order }],
      expiresAt: params.expiresAt,
    });
    return expectPresent(ack, 'Expected Perps modify order acknowledgement.');
  }

  async modifyOrders(
    request: ModifyPerpsOrdersRequest,
  ): Promise<PerpsOrderCommandAck[]> {
    const params = parseUserInput(request, ModifyPerpsOrdersRequestSchema);
    return await this.#sendSignedWsCommand({
      op: [
        'modifyOrders',
        params.orders.map((order) => [
          order.orderId,
          toRawPerpsOrder(order.order),
        ]),
      ],
      responseSchema: z.array(RawPerpsOrderCommandAckSchema),
      timeoutMessage: 'Perps modify order acknowledgement timed out.',
      expiresAt: params.expiresAt,
    });
  }

  async cancelOrder(
    request: CancelPerpsOrderRequest,
  ): Promise<PerpsCommandAck> {
    const params = parseUserInput(request, CancelPerpsOrderRequestSchema);
    const [ack] =
      params.orderId !== undefined
        ? await this.cancelOrders({
            orderIds: [params.orderId],
            expiresAt: params.expiresAt,
          })
        : await this.cancelOrders({
            clientOrderIds: [params.clientOrderId],
            expiresAt: params.expiresAt,
          });
    return expectPresent(ack, 'Expected Perps cancel order acknowledgement.');
  }

  async cancelOrders(
    request: CancelPerpsOrdersRequest,
  ): Promise<PerpsCommandAck[]> {
    const params = parseUserInput(request, CancelPerpsOrdersRequestSchema);
    if (params.orderIds !== undefined) {
      return await this.#sendSignedWsCommand({
        op: ['cancelOrders', params.orderIds],
        responseSchema: z.array(PerpsCommandAckSchema),
        timeoutMessage: 'Perps cancel order acknowledgement timed out.',
        expiresAt: params.expiresAt,
      });
    }
    return await this.#sendSignedWsCommand({
      op: ['cancelOrdersCOID', params.clientOrderIds],
      responseSchema: z.array(PerpsCommandAckSchema),
      timeoutMessage: 'Perps cancel order acknowledgement timed out.',
      expiresAt: params.expiresAt,
    });
  }

  async updateLeverage(
    request: UpdatePerpsLeverageRequest,
  ): Promise<PerpsCommandAck> {
    const params = parseUserInput(request, UpdatePerpsLeverageRequestSchema);
    return await this.#sendSignedWsCommand({
      op: [
        'updateLeverage',
        [params.instrumentId, params.leverage, params.crossMargin],
      ],
      responseSchema: PerpsCommandAckSchema,
      timeoutMessage: 'Perps update leverage acknowledgement timed out.',
    });
  }

  async updateMargin(
    request: UpdatePerpsMarginRequest,
  ): Promise<PerpsCommandAck> {
    const params = parseUserInput(request, UpdatePerpsMarginRequestSchema);
    const amount = toDecimalString(params.amount);
    return await this.#sendSignedHttpCommand('/v1/trade/margin', {
      op: ['updateMargin', [params.instrumentId, amount]],
      bodyOp: {
        args: {
          amt: amount,
          iid: params.instrumentId,
        },
        type: 'updateMargin',
      },
    });
  }

  async #connect(emitResync: boolean): Promise<void> {
    await this.#connection.connect({
      onClose: () => this.#handleClose(),
      onError: () => undefined,
      onMessage: (message) => this.#handleMessage(message),
      onOpen: () => undefined,
      url: this.#wsUrl,
    });
    await this.#authenticate();
    await this.#subscribe();

    this.#reconnectScheduler.resetBackoff();
    if (emitResync) {
      this.#sequences.clear();
      this.#lastDedupedPayload.clear();
      this.#queue.push({
        reason: 'reconnect',
        type: 'resync',
      });
    }
  }

  async #authenticate(): Promise<void> {
    await this.#sendRequest(
      {
        id: this.#nextRequestId++,
        op: {
          args: {
            proxy: this.credentials.proxy,
            secret: this.credentials.secret,
          },
          type: 'auth',
        },
        req: 'post',
      },
      PerpsSessionAckSchema,
      AUTH_TIMEOUT_MS,
      'Perps session authentication timed out.',
    );
  }

  async #subscribe(): Promise<void> {
    await this.#sendRequest(
      {
        id: this.#nextRequestId++,
        req: 'sub',
        chs: PERPS_SESSION_CHANNELS,
      },
      PerpsSessionAckSchema,
      ACK_TIMEOUT_MS,
      'Perps session subscription timed out.',
    );
  }

  #authenticatedHeaders(): HeadersInit {
    return {
      'POLYMARKET-PROXY': this.credentials.proxy,
      'POLYMARKET-SECRET': this.credentials.secret,
    };
  }

  async #sendSignedWsCommand<T>(request: {
    op: PerpsSignedOp;
    responseSchema: z.ZodType<T>;
    timeoutMessage: string;
    expiresAt?: number;
  }): Promise<T> {
    const command = this.#createSignedCommand(request.op, request.expiresAt);
    return await this.#sendRequest(
      {
        ...command,
        id: this.#nextRequestId++,
        op: toPerpsCommandBodyOp(request.op),
        req: 'post',
      },
      request.responseSchema,
      ACK_TIMEOUT_MS,
      request.timeoutMessage,
    );
  }

  async #sendSignedHttpCommand(
    path: string,
    request: {
      bodyOp: unknown;
      op: PerpsSignedOp;
    },
  ): Promise<PerpsCommandAck> {
    const command = this.#createSignedCommand(request.op);
    return await unwrap(
      this.#api
        .patch(path, {
          json: {
            ...command,
            op: request.bodyOp,
          },
        })
        .andThen(validateWith(PerpsCommandAckSchema)),
    );
  }

  #createSignedCommand(op: PerpsSignedOp, expiresAt?: number) {
    const salt = randomUint32();
    const timestamp = Date.now();
    let signature: string;
    try {
      signature = signPerpsOp({
        chainId: this.#chainId,
        op,
        privateKey: this.credentials.privateKey,
        salt,
        timestamp,
      });
    } catch (error) {
      throw SigningError.fromError(
        error,
        'Could not sign the Perps session command',
      );
    }

    const body: Record<string, unknown> = {
      salt,
      sig: signature,
      ts: timestamp,
    };
    if (expiresAt !== undefined) body.exp = expiresAt;
    return body;
  }

  async #sendRequest<T>(
    frame: Record<string, unknown> & { id: number },
    schema: z.ZodType<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    const pending = createPendingResponse(schema);
    this.#pending.set(frame.id, pending);
    const timeout = setNonBlockingTimeout(() => {
      pending.reject(new TransportError(timeoutMessage));
    }, timeoutMs);

    try {
      if (!this.#connection.send(frame)) {
        throw new TransportError('Perps session transport is not open.');
      }
      return await pending.promise;
    } finally {
      clearTimeout(timeout);
      this.#pending.delete(frame.id);
    }
  }

  async #shutdown(): Promise<void> {
    this.#reconnectScheduler.stop();
    this.#rejectPending(new TransportError('Perps session closed.'));
    this.#queue.end();
    await this.#connection.close();
    this.#onClose(this);
  }

  #handleMessage(rawMessage: unknown): void {
    if (this.#handleResponse(rawMessage)) return;

    const parsed = PerpsSessionUpdateEventSchema.safeParse(rawMessage);
    if (!parsed.success) return;

    const event = parsed.data;
    if (this.#shouldSkipDedupedTick(event)) return;
    this.#pushSequenceGapIfNeeded(event);
    this.#queue.push(event);
  }

  #handleResponse(rawMessage: unknown): boolean {
    const parsed = PerpsResponseEnvelopeSchema.safeParse(rawMessage);
    if (!parsed.success || parsed.data.id === undefined) return false;

    const pending = this.#pending.get(parsed.data.id);
    if (pending === undefined) return true;

    const data = pending.schema.safeParse(parsed.data.data);
    if (!data.success) {
      pending.reject(new TransportError('Perps session empty response.'));
      return true;
    }

    if (isRejectedPerpsAck(data.data)) {
      pending.reject(
        new TransportError(
          data.data.error ?? 'Perps session request rejected.',
        ),
      );
    } else {
      pending.resolve(data.data);
    }
    return true;
  }

  #handleClose(): void {
    this.#rejectPending(new TransportError('Perps session connection closed.'));
    if (this.#closing !== undefined) return;

    this.#reconnectScheduler.schedule({
      reconnect: () => this.#connect(true),
      shouldReconnect: () => this.#closing === undefined,
    });
  }

  #rejectPending(error: Error): void {
    for (const pending of this.#pending.values()) {
      pending.reject(error);
    }
    this.#pending.clear();
  }

  #shouldSkipDedupedTick(event: {
    channel: string;
    payload: unknown;
  }): boolean {
    if (event.channel !== 'balances' && event.channel !== 'portfolio') {
      return false;
    }

    const payload = JSON.stringify(event.payload);
    const previousPayload = this.#lastDedupedPayload.get(event.channel);
    this.#lastDedupedPayload.set(event.channel, payload);
    return payload === previousPayload;
  }

  #pushSequenceGapIfNeeded(event: { channel: string; sequence: number }): void {
    const previousSequence = this.#sequences.get(event.channel);
    this.#sequences.set(event.channel, event.sequence);

    if (
      previousSequence === undefined ||
      event.sequence === previousSequence + 1
    ) {
      return;
    }

    this.#queue.push({
      channel: event.channel,
      previousSequence,
      reason: 'sequence_gap',
      sequence: event.sequence,
      type: 'resync',
    });
  }
}

function toPerpsHistoryParams<T extends Record<string, unknown>>(
  request: T & { end?: number; start?: number },
  defaultWindowMs: number,
): Omit<T, 'end' | 'start'> & PerpsHistoryParams {
  const now = Date.now();
  const { end, start, ...rest } = request;
  return {
    ...rest,
    endTimestamp: end ?? now,
    startTimestamp: start ?? now - defaultWindowMs,
  };
}

function toPerpsIntervalHistoryParams(
  request: z.output<typeof PerpsIntervalHistoryRequestBaseSchema>,
): PerpsIntervalHistoryParams {
  return {
    endTimestamp: request.end ?? Date.now(),
    interval: request.interval,
    startTimestamp: request.start,
  };
}

function decodePerpsAccountCursor<T>(
  cursor: PaginationCursor,
  schema: z.ZodType<T>,
): T {
  try {
    return schema.parse(JSON.parse(atob(cursor)));
  } catch (error) {
    throw new TransportError('Invalid Perps account pagination cursor', {
      cause: error,
    });
  }
}

function encodePerpsAccountCursor(
  state: PerpsAscendingAccountCursorState | PerpsDescendingAccountCursorState,
): PaginationCursor {
  return toPaginationCursor(btoa(JSON.stringify(state)));
}

function toPerpsSearchParams(params: object): URLSearchParams {
  return toSearchParams(
    params as Record<string, string | number | boolean | undefined>,
    snakeCase(),
  );
}

function latestPerpsDepositTimestamp(deposit: PerpsDeposit): number {
  return deposit.confirmedTimestamp ?? deposit.createdTimestamp;
}

function latestPerpsWithdrawalTimestamp(withdrawal: PerpsWithdrawal): number {
  return withdrawal.confirmedTimestamp ?? withdrawal.createdTimestamp;
}

function perpsHistoryIntervalMilliseconds(
  interval: z.output<typeof PerpsPnlIntervalSchema>,
): number {
  switch (interval) {
    case '1h':
      return 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '1d':
      return ONE_DAY_MS;
    case '1w':
      return 7 * ONE_DAY_MS;
  }
  invariant(
    false,
    `Unsupported Perps account history interval: ${String(interval)}`,
  );
}

function createPendingResponse<T>(
  schema: z.ZodType<T>,
): PendingResponse & { promise: Promise<T> } {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve, schema };
}

function toRawPerpsOrder(
  order: z.output<typeof PerpsOrderInputSchema>,
): RawPerpsOrderInput {
  return [
    order.instrumentId,
    order.buy,
    order.price === undefined ? undefined : toDecimalString(order.price),
    toDecimalString(order.quantity),
    order.timeInForce,
    order.postOnly ?? false,
    order.clientOrderId,
  ];
}

function toPerpsCommandBodyOp(op: PerpsSignedOp) {
  const [type, args] = op;
  switch (type) {
    case 'createOrders':
      return {
        args: (args as RawPerpsOrderInput[]).map(toPerpsOrderBody),
        type,
      };
    case 'modifyOrders':
      return {
        args: (args as Array<readonly [PerpsOrderId, RawPerpsOrderInput]>).map(
          ([orderId, order]) => ({
            oid: orderId,
            order: toPerpsOrderBody(order),
          }),
        ),
        type,
      };
    case 'cancelOrders':
    case 'cancelOrdersCOID':
      return { args, type };
    case 'updateLeverage': {
      const [instrumentId, leverage, crossMargin] = args as readonly [
        PerpsInstrumentId,
        number,
        boolean,
      ];
      return {
        args: {
          cross: crossMargin,
          iid: instrumentId,
          lev: leverage,
        },
        type,
      };
    }
    default:
      invariant(false, `Unsupported Perps command: ${String(type)}`);
  }
}

function toPerpsOrderBody(order: RawPerpsOrderInput) {
  const body: Record<string, unknown> = {
    buy: order[1],
    iid: order[0],
    po: order[5],
    qty: order[3],
    tif: order[4],
  };
  if (order[2] !== undefined) body.p = order[2];
  if (order[6] !== undefined) body.c = order[6];
  return body;
}

function isRejectedPerpsAck(value: unknown): value is { error?: string } {
  return (
    !Array.isArray(value) &&
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'err'
  );
}

function randomUint32(): number {
  const [value] = globalThis.crypto.getRandomValues(new Uint32Array(1));
  invariant(
    value !== undefined,
    'Expected crypto.getRandomValues to return a salt.',
  );
  return value;
}
