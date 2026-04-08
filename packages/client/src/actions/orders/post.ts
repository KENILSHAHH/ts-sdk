import {
  type OrderResponse,
  OrderResponseSchema,
  type OrderResponses,
  OrderResponsesSchema,
} from '@polymarket/bindings/clob';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { SecureClient } from '../../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../../errors';
import { parseUserInput } from '../../input';
import { validateWith } from '../../response';
import type { SignedOrder } from './types';

const PostOrdersRequestSchema = z.array(z.custom<SignedOrder>()).min(1).max(15);

export type PostOrdersRequest = z.input<typeof PostOrdersRequestSchema>;

export type PostOrderError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

export type PostOrdersError = PostOrderError | UserInputError;

/**
 * Posts a signed order for the authenticated account.
 *
 * @example
 * ```ts
 * const response = await postOrder(client, signedOrder);
 * ```
 *
 * @throws {@link PostOrderError}
 */
export function postOrder(
  client: SecureClient,
  order: SignedOrder,
): Promise<OrderResponse>;
export function postOrder(
  client: SecureClient,
): (order: SignedOrder) => Promise<OrderResponse>;
export function postOrder(client: SecureClient, order?: SignedOrder) {
  if (order === undefined) {
    return (nextOrder: SignedOrder) => {
      return postOrder(client, nextOrder);
    };
  }

  const payload = createSendOrderPayload(client, order);

  return unwrap(
    client.secureClob
      .post('/order', {
        json: payload,
      })
      .andThen(validateWith(OrderResponseSchema)),
  );
}

/**
 * Posts multiple signed orders for the authenticated account.
 *
 * @remarks
 * Accepts between 1 and 15 orders, matching the current service limit.
 *
 * @example
 * ```ts
 * const responses = await postOrders(client, [firstSignedOrder, secondSignedOrder]);
 * ```
 *
 * @throws {@link PostOrdersError}
 */
export function postOrders(
  client: SecureClient,
  orders: PostOrdersRequest,
): Promise<OrderResponses>;
export function postOrders(
  client: SecureClient,
): (orders: PostOrdersRequest) => Promise<OrderResponses>;
export function postOrders(client: SecureClient, orders?: PostOrdersRequest) {
  if (orders === undefined) {
    return (nextOrders: PostOrdersRequest) => {
      return postOrders(client, nextOrders);
    };
  }

  const validatedOrders = parseUserInput(orders, PostOrdersRequestSchema);
  const payload = validatedOrders.map((order) =>
    createSendOrderPayload(client, order),
  );

  return unwrap(
    client.secureClob
      .post('/orders', {
        json: payload,
      })
      .andThen(validateWith(OrderResponsesSchema)),
  );
}

function createSendOrderPayload(client: SecureClient, order: SignedOrder) {
  return {
    deferExec: false,
    order: {
      expiration: `${order.expiration}`,
      feeRateBps: `${order.feeRateBps}`,
      maker: order.maker,
      makerAmount: order.makerAmount,
      nonce: `${order.nonce}`,
      salt: Number.parseInt(order.salt, 10),
      side: order.side,
      signature: order.signature,
      signatureType: order.signatureType,
      signer: order.signer,
      taker: order.taker,
      takerAmount: order.takerAmount,
      tokenId: order.tokenId,
    },
    orderType: order.orderType,
    owner: client.credentials.key,
  };
}
