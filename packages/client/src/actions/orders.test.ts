import {
  type AcceptedOrderResponse,
  OrderPostStatus,
  type OrderResponse,
  OrderSide,
  OrderType,
} from '@polymarket/bindings/clob';
import { expectPresent } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { InsufficientLiquidityError } from '../errors';
import { publicClient, walletClient } from '../testing';
import { authenticateWith, executeWith } from '../viem';
import { fetchOpenOrders } from './account';
import { fetchMarket } from './markets';
import {
  cancelAll,
  cancelMarketOrders,
  cancelOrder,
  cancelOrders,
  estimateMarketPrice,
  postOrder,
  postOrders,
  prepareLimitOrder,
  prepareMarketOrder,
} from './orders';
import { listPositions } from './portfolio';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';

const market = await fetchMarket(publicClient, {
  slug: TEST_MARKET_SLUG,
});

const secureClient = await publicClient
  .beginAuthentication()
  .then(authenticateWith(walletClient));

describe('Orders', () => {
  describe('estimateMarketPrice', () => {
    it('calculates the price for a market buy at the minimum size', async () => {
      const [yesTokenId] = expectPresent(market.clobTokenIds);

      const result = await estimateMarketPrice(publicClient, {
        amount: expectPresent(market.orderMinSize),
        orderType: OrderType.FAK,
        side: OrderSide.BUY,
        tokenId: yesTokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('throws an explicit liquidity error when an FOK amount cannot fully fill', async () => {
      const [yesTokenId] = expectPresent(market.clobTokenIds);

      await expect(
        estimateMarketPrice(publicClient, {
          amount: Number.MAX_SAFE_INTEGER,
          side: OrderSide.BUY,
          tokenId: yesTokenId,
        }),
      ).rejects.toBeInstanceOf(InsufficientLiquidityError);
    });
  });

  describe('prepareMarketOrder', () => {
    it.skip('closes leftover inventory or round-trips a minimum-size market order', async () => {
      const positions = await listPositions(secureClient, {
        market: [market.id],
        user: secureClient.account.wallet,
      });
      const position = positions.find(
        (candidate) => candidate.asset && (candidate.size ?? 0) > 0,
      );

      if (position !== undefined) {
        // Recover from a previous partially executed test run by selling any
        // leftover inventory, and use that cleanup path to exercise market
        // order posting.
        const result = await prepareMarketOrder(secureClient, {
          amount: expectPresent(position.size),
          side: OrderSide.SELL,
          tokenId: expectPresent(position.asset),
        })
          .then(executeWith(walletClient))
          .then(postOrder(secureClient));
        expect(result.ok).toBe(true);
        const acceptedResult = expectAcceptedOrderResponse(result);

        expect(acceptedResult.orderId).not.toBe('');
        return;
      }

      const [yesTokenId] = expectPresent(market.clobTokenIds);
      const buyResult = await prepareMarketOrder(secureClient, {
        amount: expectPresent(market.orderMinSize),
        side: OrderSide.BUY,
        tokenId: yesTokenId,
      })
        .then(executeWith(walletClient))
        .then(postOrder(secureClient));
      expect(buyResult.ok).toBe(true);
      const acceptedBuyResult = expectAcceptedOrderResponse(buyResult);

      expect(acceptedBuyResult.orderId).not.toBe('');

      // When the test starts flat, buy a minimum-sized position and sell it
      // immediately after so we still exercise market orders while minimizing
      // inventory risk from the test itself.
      const sellResult = await prepareMarketOrder(secureClient, {
        amount: Number.parseInt(acceptedBuyResult.takingAmount, 10),
        side: OrderSide.SELL,
        tokenId: yesTokenId,
      })
        .then(executeWith(walletClient))
        .then(postOrder(secureClient));
      expect(sellResult.ok).toBe(true);
      const acceptedSellResult = expectAcceptedOrderResponse(sellResult);

      expect(acceptedSellResult.orderId).not.toBe('');
    });
  });

  describe('prepareLimitOrder', () => {
    it('starts preparing a limit order to buy YES at the minimum size', async () => {
      const [yesTokenId] = expectPresent(market.clobTokenIds);

      const result = await prepareLimitOrder(secureClient, {
        orderType: OrderType.GTC,
        price: expectPresent(market.orderPriceMinTickSize),
        side: OrderSide.BUY,
        size: expectPresent(market.orderMinSize),
        tokenId: yesTokenId,
      })
        .then(executeWith(walletClient))
        .then(postOrder(secureClient));

      expect(result.ok).toBe(true);
    });
  });

  describe('cancelOrder', () => {
    it('cancels a single open order', async () => {
      const { orderId } = await createRestingLimitOrder();
      const result = await cancelOrder(secureClient, { orderId });

      expect(result.canceled).toContain(orderId);

      const openOrders = await fetchOpenOrders(secureClient, {
        market: market.id,
      });

      expect(openOrders.some((order) => order.id === orderId)).toBe(false);
    });
  });

  describe('postOrders', () => {
    it('posts multiple resting limit orders', async () => {
      const [firstOrder, secondOrder] = await Promise.all([
        createSignedRestingLimitOrder(),
        createSignedRestingLimitOrder(),
      ]);
      const responses = await postOrders(secureClient, [
        firstOrder,
        secondOrder,
      ]);

      expect(responses).toHaveLength(2);
      expect(responses.every((response) => response.ok)).toBe(true);

      for (const response of responses) {
        const acceptedResponse = expectAcceptedOrderResponse(response);

        expect(acceptedResponse.orderId).not.toBe('');
        expect(acceptedResponse.status).toBe(OrderPostStatus.LIVE);
      }

      await cancelAll(secureClient);
    });
  });

  describe('cancelOrders', () => {
    it('cancels multiple open orders', async () => {
      const firstOrder = await createRestingLimitOrder();
      const secondOrder = await createRestingLimitOrder();
      const result = await cancelOrders(secureClient, {
        orderIds: [firstOrder.orderId, secondOrder.orderId],
      });

      expect(result.canceled).toEqual(
        expect.arrayContaining([firstOrder.orderId, secondOrder.orderId]),
      );
    });
  });

  describe('cancelAll', () => {
    it('cancels all open orders', async () => {
      const order = await createRestingLimitOrder();
      const result = await cancelAll(secureClient);

      expect(result.canceled).toContain(order.orderId);
    });
  });

  describe('cancelMarketOrders', () => {
    it.skip('cancels open orders for a market and asset', async () => {
      const order = await createRestingLimitOrder();
      const result = await cancelMarketOrderWithRetry(order);

      expect(result.canceled).toContain(order.orderId);
    });
  });
});

async function createRestingLimitOrder(): Promise<{
  tokenId: string;
  orderId: string;
}> {
  const response = await createSignedRestingLimitOrder().then(
    postOrder(secureClient),
  );
  expect(response.ok).toBe(true);
  const acceptedResponse = expectAcceptedOrderResponse(response);

  expect(acceptedResponse.orderId).not.toBe('');
  expect(acceptedResponse.status).toBe(OrderPostStatus.LIVE);

  return {
    tokenId: expectPresent(market.clobTokenIds)[0],
    orderId: acceptedResponse.orderId,
  };
}

async function createSignedRestingLimitOrder() {
  const [yesTokenId] = expectPresent(market.clobTokenIds);
  const tickSize = expectPresent(market.orderPriceMinTickSize);
  const size = expectPresent(market.orderMinSize);

  return prepareLimitOrder(secureClient, {
    orderType: OrderType.GTC,
    price: tickSize,
    side: OrderSide.BUY,
    size,
    tokenId: yesTokenId,
  }).then(executeWith(walletClient));
}

async function cancelMarketOrderWithRetry(order: {
  tokenId: string;
  orderId: string;
}) {
  const conditionId = expectPresent(market.conditionId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await cancelMarketOrders(secureClient, {
      assetId: order.tokenId,
      market: conditionId,
    });

    if (result.canceled.includes(order.orderId)) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return cancelMarketOrders(secureClient, {
    assetId: order.tokenId,
    market: conditionId,
  });
}

function expectAcceptedOrderResponse(
  response: OrderResponse,
): AcceptedOrderResponse {
  expect(response.ok).toBe(true);

  if (!response.ok) {
    throw new Error(
      `Expected accepted order response, received: ${response.code}`,
    );
  }

  return response;
}
