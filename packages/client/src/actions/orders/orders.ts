import { ZERO_ADDRESS } from '@polymarket/types';
import type { OrderDraft, SignedOrder, UnsignedOrder } from './types';

export function createUnsignedOrder(order: OrderDraft): UnsignedOrder {
  return {
    chainId: order.chainId,
    exchangeAddress: order.exchangeAddress,
    expiration: order.expiration,
    feeRateBps: order.feeRateBps,
    maker: order.funderAddress,
    makerAmount: order.offeredAmount.toString(),
    // CLOB v1 still requires a nonce on the order, even though it is expected to disappear in v2.
    nonce: 0,
    orderType: order.orderType,
    salt: generateOrderSalt().toString(),
    side: order.side,
    signatureType: order.signatureType,
    signer: order.signer,
    taker: order.allowedTaker ?? ZERO_ADDRESS,
    takerAmount: order.requestedAmount.toString(),
    tokenId: order.tokenId,
  };
}

export function createSignedOrder(
  order: UnsignedOrder,
  signature: SignedOrder['signature'],
): SignedOrder {
  const {
    chainId: _chainId,
    exchangeAddress: _exchangeAddress,
    ...signedFields
  } = order;

  return {
    ...signedFields,
    signature,
  };
}

function generateOrderSalt(): bigint {
  return BigInt(Math.round(Math.random() * Date.now()));
}
