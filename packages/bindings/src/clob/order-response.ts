import { never, type TxHash } from '@polymarket/types';
import { z } from 'zod';
import { TxHashSchema } from '../shared';

export const RawOrderResponseSchema = z.object({
  errorMsg: z.string(),
  makingAmount: z.string(),
  orderID: z.string(),
  status: z.string(),
  success: z.boolean(),
  takingAmount: z.string(),
  tradeIDs: z.array(z.string()).default([]),
  transactionsHashes: z.array(z.string()).default([]),
});

export type RawOrderResponse = z.infer<typeof RawOrderResponseSchema>;

export const RawOrderResponsesSchema = z.array(RawOrderResponseSchema);

export type RawOrderResponses = z.infer<typeof RawOrderResponsesSchema>;

export enum OrderPostStatus {
  LIVE = 'live',
  MATCHED = 'matched',
  DELAYED = 'delayed',
}

export const OrderPostStatusSchema = z.nativeEnum(OrderPostStatus);

export enum OrderResponseErrorCode {
  UNMATCHED = 'unmatched',
  MARKET_NOT_READY = 'market_not_ready',
  NOT_ENOUGH_BALANCE = 'not_enough_balance',
  INVALID_NONCE = 'invalid_nonce',
  INVALID_EXPIRATION = 'invalid_expiration',
  POST_ONLY_WOULD_CROSS = 'post_only_would_cross',
  FOK_NOT_FILLED = 'fok_not_filled',
  FAK_NOT_FILLED = 'fak_not_filled',
  UNKNOWN = 'unknown',
}

export const OrderResponseErrorCodeSchema = z.nativeEnum(
  OrderResponseErrorCode,
);

export type AcceptedOrderResponse = {
  ok: true;
  orderId: string;
  status: OrderPostStatus;
  makingAmount: string;
  takingAmount: string;
  transactionsHashes: TxHash[];
  tradeIds: string[];
};

export type RejectedOrderResponse = {
  ok: false;
  code: OrderResponseErrorCode;
  message: string;
};

export type OrderResponse = AcceptedOrderResponse | RejectedOrderResponse;

export type OrderResponses = OrderResponse[];

export const AcceptedOrderResponseSchema = z.object({
  ok: z.literal(true),
  orderId: z.string().min(1),
  status: OrderPostStatusSchema,
  makingAmount: z.string(),
  takingAmount: z.string(),
  tradeIds: z.array(z.string()),
  transactionsHashes: z.array(TxHashSchema),
});

export const RejectedOrderResponseSchema = z.object({
  ok: z.literal(false),
  code: OrderResponseErrorCodeSchema,
  message: z.string().min(1),
});

export const OrderResponseSchema = RawOrderResponseSchema.transform(
  normalizeOrderResponse,
);

export const OrderResponsesSchema = z.array(OrderResponseSchema);

function isAcceptedOrderResponse(response: RawOrderResponse): boolean {
  return (
    response.success &&
    response.errorMsg === '' &&
    response.orderID !== '' &&
    isOrderPostStatus(response.status)
  );
}

function parseOrderPostStatus(status: string): OrderPostStatus {
  switch (status) {
    case OrderPostStatus.LIVE:
      return OrderPostStatus.LIVE;
    case OrderPostStatus.MATCHED:
      return OrderPostStatus.MATCHED;
    case OrderPostStatus.DELAYED:
      return OrderPostStatus.DELAYED;
    default:
      never(`Unexpected order post status: ${status}`);
  }
}

function normalizeOrderResponse(response: RawOrderResponse): OrderResponse {
  if (isAcceptedOrderResponse(response)) {
    return AcceptedOrderResponseSchema.parse({
      makingAmount: response.makingAmount,
      ok: true,
      orderId: response.orderID,
      status: parseOrderPostStatus(response.status),
      takingAmount: response.takingAmount,
      tradeIds: response.tradeIDs,
      transactionsHashes: response.transactionsHashes,
    });
  }

  return RejectedOrderResponseSchema.parse({
    code: inferOrderResponseErrorCode(response),
    message: response.errorMsg || 'Unknown order failure',
    ok: false,
  });
}

function inferOrderResponseErrorCode(
  response: RawOrderResponse,
): OrderResponseErrorCode {
  // This is a boundary heuristic over legacy mixed `success`/`status`/`errorMsg`
  // fields. It is intentionally temporary and should be removed once the API
  // exposes structured success and error variants directly.
  if (response.status === 'unmatched') {
    return OrderResponseErrorCode.UNMATCHED;
  }

  switch (response.errorMsg) {
    case 'the market is not yet ready to process new orders':
      return OrderResponseErrorCode.MARKET_NOT_READY;
    case 'invalid nonce':
      return OrderResponseErrorCode.INVALID_NONCE;
    case 'invalid expiration':
      return OrderResponseErrorCode.INVALID_EXPIRATION;
    case 'invalid post-only order: order crosses book':
      return OrderResponseErrorCode.POST_ONLY_WOULD_CROSS;
    case "order couldn't be fully filled. FOK orders are fully filled or killed.":
      return OrderResponseErrorCode.FOK_NOT_FILLED;
    case 'no orders found to match with FAK order. FAK orders are partially filled or killed if no match is found.':
      return OrderResponseErrorCode.FAK_NOT_FILLED;
  }

  if (response.errorMsg.includes('not enough balance / allowance')) {
    return OrderResponseErrorCode.NOT_ENOUGH_BALANCE;
  }

  return OrderResponseErrorCode.UNKNOWN;
}

function isOrderPostStatus(status: string): status is OrderPostStatus {
  return (
    status === OrderPostStatus.LIVE ||
    status === OrderPostStatus.MATCHED ||
    status === OrderPostStatus.DELAYED
  );
}
