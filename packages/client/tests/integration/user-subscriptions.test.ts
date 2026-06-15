import { OrderSide } from '@polymarket/bindings';
import { OrderPostStatus } from '@polymarket/bindings/clob';
import type { UserEvent } from '@polymarket/bindings/subscriptions';
import { expectPresent } from '@polymarket/types';
import { describe, expect, it, publicClient } from './fixtures';
import { expectAcceptedOrderResponse } from './helpers';
import { findHighVolumeLowPriceMarket } from './markets';

const market = await findHighVolumeLowPriceMarket(publicClient);
const tokenId = expectPresent(market.outcomes.yes.tokenId);
const price = expectPresent(market.trading.minimumTickSize);
const size = expectPresent(market.trading.minimumOrderSize);

type UserOrderEvent = Extract<UserEvent, { type: 'order' }>;

describe('User subscriptions', { timeout: 30_000 }, () => {
  it('receives an order placement event after posting a resting limit order', async ({
    secureClientWithDepositWallet,
  }) => {
    const handle = await secureClientWithDepositWallet.subscribe([
      { topic: 'user' },
    ]);

    let orderId: string | undefined;

    try {
      const response = await secureClientWithDepositWallet.placeLimitOrder({
        postOnly: true,
        price,
        side: OrderSide.BUY,
        size,
        tokenId,
      });
      const acceptedResponse = expectAcceptedOrderResponse(response);
      orderId = acceptedResponse.orderId;

      expect(acceptedResponse.status).toBe(OrderPostStatus.LIVE);

      const event = await waitForUserOrderPlacementEvent(handle, orderId);

      expect(event).toMatchObject({
        payload: {
          id: orderId,
          market: expect.any(String),
          orderEventType: 'PLACEMENT',
          price: String(price),
          side: OrderSide.BUY,
          tokenId,
        },
        topic: 'user',
        type: 'order',
      });
    } finally {
      if (orderId !== undefined) {
        await secureClientWithDepositWallet.cancelOrder({ orderId });
      }

      await handle.close();
      await secureClientWithDepositWallet.closeSubscriptions();
    }
  });
});

async function waitForUserOrderPlacementEvent(
  handle: AsyncIterable<UserEvent>,
  orderId: string,
): Promise<UserOrderEvent> {
  for await (const event of handle) {
    if (
      event.type === 'order' &&
      event.payload.id === orderId &&
      event.payload.orderEventType === 'PLACEMENT'
    ) {
      return event;
    }
  }

  throw new Error(
    `User subscription closed before order placement event arrived for ${orderId}.`,
  );
}
