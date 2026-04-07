import { OrderSide } from '@polymarket/bindings/clob';
import type { EvmAddress } from '@polymarket/types';
import type { TypedDataField, TypedDataPayload } from '../../types';
import type { UnsignedOrder } from './types';

const EIP712_DOMAIN: readonly TypedDataField[] = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const ORDER_STRUCTURE: readonly TypedDataField[] = [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'address' },
  { name: 'signer', type: 'address' },
  { name: 'taker', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'feeRateBps', type: 'uint256' },
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
];

const PROTOCOL_NAME = 'Polymarket CTF Exchange';
const PROTOCOL_VERSION = '1';

type OrderTypedDataMessage = {
  expiration: bigint;
  feeRateBps: bigint;
  maker: EvmAddress;
  makerAmount: bigint;
  nonce: bigint;
  salt: bigint;
  side: number;
  signatureType: UnsignedOrder['signatureType'];
  signer: EvmAddress;
  taker: EvmAddress;
  takerAmount: bigint;
  tokenId: bigint;
};

export function createOrderTypedDataPayload(
  order: UnsignedOrder,
): TypedDataPayload {
  return {
    domain: {
      chainId: order.chainId,
      name: PROTOCOL_NAME,
      verifyingContract: order.exchangeAddress,
      version: PROTOCOL_VERSION,
    },
    message: createOrderTypedDataMessage(order),
    primaryType: 'Order',
    types: {
      EIP712Domain: EIP712_DOMAIN,
      Order: ORDER_STRUCTURE,
    },
  };
}

function createOrderTypedDataMessage(
  order: UnsignedOrder,
): OrderTypedDataMessage {
  return {
    expiration: BigInt(order.expiration),
    feeRateBps: BigInt(order.feeRateBps),
    maker: order.maker,
    makerAmount: BigInt(order.makerAmount),
    // CLOB v1 still signs nonce, even though it is expected to disappear in v2.
    nonce: BigInt(order.nonce),
    salt: BigInt(order.salt),
    side: encodeOrderSide(order.side),
    signatureType: order.signatureType,
    signer: order.signer,
    taker: order.taker,
    takerAmount: BigInt(order.takerAmount),
    tokenId: BigInt(order.tokenId),
  };
}

function encodeOrderSide(side: OrderSide): number {
  return side === OrderSide.BUY ? 0 : 1;
}
