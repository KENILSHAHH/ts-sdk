import { OrderSide } from '@polymarket/bindings';
import { SignatureType } from '@polymarket/bindings/clob';
import {
  type Erc1271Signature,
  type EvmAddress,
  type EvmSignature,
  expectErc1271Signature,
  expectHexString,
  type HexString,
} from '@polymarket/types';
import { AbiParameters, Bytes, Hash } from 'ox';
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

const TYPED_DATA_SIGN_STRUCTURE: readonly TypedDataField[] = [
  { name: 'contents', type: 'Order' },
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

const PROTOCOL_NAME = 'Polymarket CTF Exchange';
const PROTOCOL_VERSION = '2';
const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet';
const DEPOSIT_WALLET_DOMAIN_VERSION = '1';
const BYTES32_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ORDER_TYPE_STRING =
  'Order(uint256 salt,address maker,address signer,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint8 side,uint8 signatureType,uint256 timestamp,bytes32 metadata,bytes32 builder)';
const ORDER_TYPE_HASH = Hash.keccak256(Bytes.fromString(ORDER_TYPE_STRING), {
  as: 'Hex',
});
const DOMAIN_TYPE_HASH = Hash.keccak256(
  Bytes.fromString(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
  ),
  { as: 'Hex' },
);
const PROTOCOL_NAME_HASH = Hash.keccak256(Bytes.fromString(PROTOCOL_NAME), {
  as: 'Hex',
});
const PROTOCOL_VERSION_HASH = Hash.keccak256(
  Bytes.fromString(PROTOCOL_VERSION),
  { as: 'Hex' },
);

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

function createLegacyOrderTypedDataPayload(
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

export function createOrderTypedDataPayload(
  order: UnsignedOrder,
): TypedDataPayload {
  const orderPayload = createLegacyOrderTypedDataPayload(order);

  if (order.signatureType !== SignatureType.POLY_1271) {
    return orderPayload;
  }

  return {
    domain: orderPayload.domain,
    message: {
      chainId: order.chainId,
      contents: orderPayload.message,
      name: DEPOSIT_WALLET_DOMAIN_NAME,
      salt: BYTES32_ZERO,
      verifyingContract: order.signer,
      version: DEPOSIT_WALLET_DOMAIN_VERSION,
    },
    primaryType: 'TypedDataSign',
    types: {
      Order: ORDER_STRUCTURE,
      TypedDataSign: TYPED_DATA_SIGN_STRUCTURE,
    },
  };
}

export function createOrderSignature(
  order: UnsignedOrder,
  signature: EvmSignature,
): EvmSignature | Erc1271Signature {
  if (order.signatureType !== SignatureType.POLY_1271) {
    return signature;
  }

  const contentsType = Bytes.toHex(Bytes.fromString(ORDER_TYPE_STRING));
  const contentsTypeLength = ORDER_TYPE_STRING.length
    .toString(16)
    .padStart(4, '0');

  return expectErc1271Signature(
    `0x${signature.slice(2)}${createAppDomainSeparator(order).slice(2)}${createOrderContentsHash(order).slice(2)}${contentsType.slice(2)}${contentsTypeLength}`,
  );
}

function createAppDomainSeparator(order: UnsignedOrder): HexString {
  return expectHexString(
    Hash.keccak256(
      AbiParameters.encode(
        [
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'address' },
        ],
        [
          DOMAIN_TYPE_HASH,
          PROTOCOL_NAME_HASH,
          PROTOCOL_VERSION_HASH,
          BigInt(order.chainId),
          order.exchangeAddress,
        ],
      ),
      { as: 'Hex' },
    ),
  );
}

function createOrderContentsHash(order: UnsignedOrder): HexString {
  const message = createOrderTypedDataMessage(order);

  return expectHexString(
    Hash.keccak256(
      AbiParameters.encode(
        [
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'address' },
          { type: 'address' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint8' },
          { type: 'uint8' },
          { type: 'uint256' },
          { type: 'bytes32' },
          { type: 'bytes32' },
        ],
        [
          ORDER_TYPE_HASH,
          message.salt,
          message.maker,
          message.signer,
          message.tokenId,
          message.makerAmount,
          message.takerAmount,
          message.side,
          message.signatureType,
          message.timestamp,
          message.metadata,
          message.builder,
        ],
      ),
      { as: 'Hex' },
    ),
  );
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
