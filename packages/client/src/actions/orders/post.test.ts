import { OrderSide, OrderType, toTokenId } from '@polymarket/bindings';
import { SignatureType } from '@polymarket/bindings/clob';
import type { EvmAddress, EvmSignature, HexString } from '@polymarket/types';
import { ResultAsync } from '@polymarket/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { postOrder } from './post';
import type { SignedOrder } from './types';

const MAKER = '0x57ffbc34de23124faeb8387fcd689d314e57accd' as EvmAddress;
const SIGNATURE =
  '0x111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111b' as EvmSignature;
const BYTES32_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as HexString;

describe('postOrder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves large salts when posting signed orders', async () => {
    const post = vi.fn().mockReturnValue(
      ResultAsync.fromPromise(
        Promise.resolve(
          new Response(
            JSON.stringify({
              errorMsg: '',
              makingAmount: '1000000',
              orderID: 'order-1',
              status: 'live',
              success: true,
              takingAmount: '500000',
              tradeIDs: [],
              transactionsHashes: [],
            }),
            {
              headers: { 'content-type': 'application/json' },
              status: 200,
            },
          ),
        ),
        (error) => error as Error,
      ),
    );

    await postOrder({
      credentials: { key: 'api-key' },
      secureClob: { post },
    } as never)(createSignedOrderFixture());

    expect(post).toHaveBeenCalledWith('/order', {
      json: expect.objectContaining({
        order: expect.objectContaining({
          salt: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        }),
      }),
    });
  });
});

function createSignedOrderFixture(): SignedOrder {
  return {
    builder: BYTES32_ZERO,
    expiration: 0,
    maker: MAKER,
    makerAmount: '1000000',
    metadata: BYTES32_ZERO,
    orderType: OrderType.GTC,
    salt: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    side: OrderSide.BUY,
    signature: SIGNATURE,
    signatureType: SignatureType.EOA,
    signer: MAKER,
    takerAmount: '500000',
    timestamp: '0',
    tokenId: toTokenId('1'),
  };
}
