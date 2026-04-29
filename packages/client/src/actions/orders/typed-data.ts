import { OrderSide } from '@polymarket/bindings';
import type { EvmAddress, HexString } from '@polymarket/types';
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
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'metadata', type: 'bytes32' },
  { name: 'builder', type: 'bytes32' },
];

const PROTOCOL_NAME = 'Polymarket CTF Exchange';
const PROTOCOL_VERSION = '2';

type OrderTypedDataMessage = {
  builder: HexString;
  maker: EvmAddress;
  makerAmount: bigint;
  metadata: HexString;
  salt: bigint;
  side: number;
  signatureType: UnsignedOrder['signatureType'];
  signer: EvmAddress;
  takerAmount: bigint;
  timestamp: bigint;
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
    builder: order.builder,
    maker: order.maker,
    makerAmount: BigInt(order.makerAmount),
    metadata: order.metadata,
    salt: BigInt(order.salt),
    side: encodeOrderSide(order.side),
    signatureType: order.signatureType,
    signer: order.signer,
    takerAmount: BigInt(order.takerAmount),
    timestamp: BigInt(order.timestamp),
    tokenId: BigInt(order.tokenId),
  };
}

function encodeOrderSide(side: OrderSide): number {
  return side === OrderSide.BUY ? 0 : 1;
}
