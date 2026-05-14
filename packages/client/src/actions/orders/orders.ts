import { SignatureType } from '@polymarket/bindings/clob';
import type { HexString } from '@polymarket/types';
import type { AccountIdentity } from '../../account';
import { toSignatureType } from '../../account';
import type { OrderDraft, SignedOrder, UnsignedOrder } from './types';

const BYTES32_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000' satisfies HexString;

export function createUnsignedOrder(
  order: OrderDraft,
  account: AccountIdentity,
): UnsignedOrder {
  const signatureType = toSignatureType(account.walletType);

  return {
    builder: order.builderCode ?? BYTES32_ZERO,
    chainId: order.chainId,
    exchangeAddress: order.exchangeAddress,
    expiration: order.expiration,
    maker: order.funderAddress,
    makerAmount: order.offeredAmount.toString(),
    metadata: BYTES32_ZERO,
    orderType: order.orderType,
    salt: generateOrderSalt().toString(),
    side: order.side,
    signatureType,
    signer:
      signatureType === SignatureType.POLY_1271 ? account.wallet : order.signer,
    takerAmount: order.requestedAmount.toString(),
    timestamp: Date.now().toString(),
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
  const bytes = new Uint8Array(32);

  globalThis.crypto.getRandomValues(bytes);

  return BigInt(
    `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
  );
}
