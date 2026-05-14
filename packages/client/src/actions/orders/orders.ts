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
  const bytes = new Uint8Array(8);

  globalThis.crypto.getRandomValues(bytes);

  const value = BigInt(
    `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
  );

  // Cap the salt to 53 bits (Number.MAX_SAFE_INTEGER == 2^53 - 1).
  //
  // The CLOB wire contract expects `salt` as a JSON number, so the post
  // pipeline coerces this string through `Number.parseInt` before sending.
  // JavaScript `number` is an IEEE-754 double and can only represent integers
  // exactly up to 2^53 - 1; anything larger is silently rounded. The signature,
  // however, is produced over the original (un-rounded) salt via `BigInt`, so
  // any rounding on the wire side causes the server to reconstruct a different
  // EIP-712 hash and reject the order with "invalid signature".
  //
  // 53 bits is still ~9.0e15 of collision space (vastly more than the legacy
  // `Math.random() * Date.now()` salt), and keeps the wire round-trip lossless.
  return value & ((1n << 53n) - 1n);
}
