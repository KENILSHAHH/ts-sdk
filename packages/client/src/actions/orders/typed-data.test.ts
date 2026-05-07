import { OrderSide, OrderType, toTokenId } from '@polymarket/bindings';
import { SignatureType } from '@polymarket/bindings/clob';
import type { EvmAddress, HexString } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { createOrderTypedDataPayload } from './typed-data';
import type { UnsignedOrder } from './types';

const EXCHANGE_ADDRESS =
  '0x4bfb41d5b3570defd03c39a94d8de6bd8b8982e' as EvmAddress;
const DEPOSIT_WALLET_ADDRESS =
  '0x57ffbc34de23124faeb8387fcd689d314e57accd' as EvmAddress;

describe('createOrderTypedDataPayload', () => {
  it('wraps POLY_1271 orders with the wallet domain and app message domain', () => {
    const payload = createOrderTypedDataPayload(
      createUnsignedOrder(SignatureType.POLY_1271),
    );

    expect(payload.domain).toEqual({
      chainId: 137,
      name: 'DepositWallet',
      verifyingContract: DEPOSIT_WALLET_ADDRESS,
      version: '1',
    });
    expect(payload.message).toMatchObject({
      chainId: 137,
      name: 'Polymarket CTF Exchange',
      salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      verifyingContract: EXCHANGE_ADDRESS,
      version: '2',
    });
    expect(payload.primaryType).toBe('TypedDataSign');
  });

  it('signs non-POLY_1271 orders directly against the app domain', () => {
    const payload = createOrderTypedDataPayload(
      createUnsignedOrder(SignatureType.EOA),
    );

    expect(payload.domain).toEqual({
      chainId: 137,
      name: 'Polymarket CTF Exchange',
      verifyingContract: EXCHANGE_ADDRESS,
      version: '2',
    });
    expect(payload.primaryType).toBe('Order');
  });
});

function createUnsignedOrder(signatureType: SignatureType): UnsignedOrder {
  return {
    builder:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as HexString,
    chainId: 137,
    exchangeAddress: EXCHANGE_ADDRESS,
    expiration: 0,
    maker: DEPOSIT_WALLET_ADDRESS,
    makerAmount: '1000000',
    metadata:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as HexString,
    orderType: OrderType.GTC,
    salt: '1',
    side: OrderSide.BUY,
    signatureType,
    signer: DEPOSIT_WALLET_ADDRESS,
    takerAmount: '500000',
    timestamp: '0',
    tokenId: toTokenId('1'),
  };
}
