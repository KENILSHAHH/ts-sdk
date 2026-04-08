import {
  type OrderResponse,
  OrderResponseSchema,
} from '@polymarket/bindings/clob';
import { unwrap } from '@polymarket/types';
import type { SecureClient } from '../../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
} from '../../errors';
import { validateWith } from '../../response';
import type { SignedOrder } from './types';

export type PostOrderError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

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

  return submitOrder(client, order);
}

async function submitOrder(
  client: SecureClient,
  order: SignedOrder,
): Promise<OrderResponse> {
  const payload = createPostOrderPayload(client, order);

  return unwrap(
    client.secureClob
      .post('/order', {
        json: payload,
      })
      .andThen(validateWith(OrderResponseSchema)),
  );
}

function createPostOrderPayload(client: SecureClient, order: SignedOrder) {
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
