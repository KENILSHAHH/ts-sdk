import { toDecimalString } from '@polymarket/bindings';
import {
  PerpsClientOrderIdSchema,
  type PerpsCommandAck,
  PerpsCommandAckSchema,
  type PerpsCredentials,
  PerpsDecimalInputSchema,
  type PerpsInstrumentId,
  PerpsInstrumentIdSchema,
  type PerpsOrderCommandAck,
  type PerpsOrderId,
  PerpsOrderIdSchema,
  type PerpsTimeInForce,
  PerpsTimeInForceSchema,
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
import { SigningError, TransportError } from '../../errors';
import { parseUserInput } from '../../input';
import { validateWith } from '../../response';
import type { ServiceClient } from '../../ServiceClient';
import { PerpsWebSocketHeartbeat } from '../heartbeat';
import { ReconnectScheduler, WebSocketConnection } from '../lifecycle';
import { type PerpsSignedOp, signPerpsOp } from './signing';

const AUTH_TIMEOUT_MS = 30_000;
const ACK_TIMEOUT_MS = 30_000;
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

export type { PerpsSessionEvent } from '@polymarket/bindings/subscriptions';

export type PerpsSessionOptions = {
  api: ServiceClient;
  chainId: number;
  credentials: PerpsCredentials;
  onClose: (session: PerpsSession) => void;
  url: string;
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

export class PerpsSession implements AsyncIterable<PerpsSessionEvent> {
  readonly credentials: PerpsCredentials;
  readonly #api: ServiceClient;
  readonly #chainId: number;
  readonly #onClose: (session: PerpsSession) => void;
  readonly #url: string;
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
    this.#api = options.api;
    this.#chainId = options.chainId;
    this.credentials = options.credentials;
    this.#onClose = options.onClose;
    this.#url = options.url;
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
      url: this.#url,
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
