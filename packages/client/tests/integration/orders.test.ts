import { OrderSide, OrderType } from '@polymarket/bindings';
import { OrderPostStatus } from '@polymarket/bindings/clob';
import {
  createSecureClient,
  InsufficientLiquidityError,
  type Market,
  type PublicClient,
  type SecureClient,
} from '@polymarket/client';
import { fetchNegRisk } from '@polymarket/client/actions';
import { expectPresent } from '@polymarket/types';
import { afterAll } from 'vitest';
import { describe, expect, it, runMeteredTests } from './fixtures';
import { expectAcceptedOrderResponse } from './helpers';
import { findHighVolumeLowPriceMarket } from './markets';

let marketPromise: Promise<Market> | undefined;
let marketOrderCleanup:
  | {
      market: Market;
      secureClient: SecureClient;
    }
  | undefined;

describe('Orders', { timeout: 60_000 }, () => {
  describe('estimateMarketPrice', () => {
    it('calculates the price for a market buy at the minimum size', async ({
      publicClient,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);

      const result = await publicClient.estimateMarketPrice({
        amount: expectPresent(market.trading.minimumOrderSize),
        orderType: OrderType.FAK,
        side: OrderSide.BUY,
        tokenId: yesTokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('throws an explicit liquidity error when an FOK amount cannot fully fill', async ({
      publicClient,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);

      await expect(
        publicClient.estimateMarketPrice({
          orderType: OrderType.FOK,
          amount: Number.MAX_SAFE_INTEGER,
          side: OrderSide.BUY,
          tokenId: yesTokenId,
        }),
      ).rejects.toBeInstanceOf(InsufficientLiquidityError);
    });
  });

  describe('prepareMarketOrder', () => {
    afterAll(async () => {
      if (marketOrderCleanup === undefined) {
        return;
      }

      const { market, secureClient } = marketOrderCleanup;
      const page = await secureClient
        .listPositions({
          user: secureClient.account.wallet,
        })
        .firstPage();

      if (page.items.length === 0) {
        return;
      }

      const position = page.items.find(
        (candidate) => candidate.tokenId === market.outcomes.yes.tokenId,
      );

      await secureClient
        .placeMarketOrder({
          side: OrderSide.SELL,
          shares: expectPresent(position?.size),
          tokenId: expectPresent(position?.tokenId),
        })
        .then(expectAcceptedOrderResponse);
    });

    it.runIf(runMeteredTests)(
      'closes leftover inventory or round-trips a minimum-size market order',
      async ({ annotate, publicClient, secureClientWithDepositWallet }) => {
        const market = await findOrderMarket(publicClient);
        marketOrderCleanup = {
          market,
          secureClient: secureClientWithDepositWallet,
        };

        const positions = await secureClientWithDepositWallet
          .listPositions({
            user: secureClientWithDepositWallet.account.wallet,
          })
          .firstPage();
        const position = positions.items.find(
          (candidate) => candidate.tokenId && Number(candidate.size ?? 0) > 0,
        );

        if (position !== undefined) {
          annotate(
            `Found existing position in condition ${position.conditionId} with size ${position.size} and asset ${position.tokenId}, closing with market order...`,
          );

          // Recover from a previous partially executed test run by selling any
          // leftover inventory, and use that cleanup path to exercise market
          // order posting.
          const result = await secureClientWithDepositWallet
            .placeMarketOrder({
              side: OrderSide.SELL,
              shares: expectPresent(position.size),
              tokenId: expectPresent(position.tokenId),
            })
            .then(expectAcceptedOrderResponse);

          expect(result.orderId).not.toBe('');
          return;
        }

        annotate(
          'No existing positions found, placing a minimum-size buy market order...',
        );

        const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
        const buyResult = await secureClientWithDepositWallet
          .placeMarketOrder({
            amount: expectPresent(1),
            side: OrderSide.BUY,
            tokenId: yesTokenId,
          })
          .then(expectAcceptedOrderResponse);

        expect(buyResult.orderId).not.toBe('');
      },
    );

    it('carries builder attribution onto the prepared market order', async ({
      builderCode,
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);

      const order = await secureClientWithDepositWallet.createMarketOrder({
        amount: expectPresent(market.trading.minimumOrderSize),
        builderCode,
        side: OrderSide.BUY,
        tokenId: yesTokenId,
      });

      expect(order.builder).toBe(builderCode);
    });
  });

  describe('prepareLimitOrder', () => {
    it('allows to place a limit order for the desired size and price', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
      const minPrice = expectPresent(market.trading.minimumTickSize);
      const minSize = expectPresent(market.trading.minimumOrderSize);

      const result = await secureClientWithDepositWallet.placeLimitOrder({
        price: minPrice,
        side: OrderSide.BUY,
        size: minSize,
        tokenId: yesTokenId,
      });

      expect(result.ok).toBe(true);
    });

    it('carries post-only submission options onto the prepared order', async ({
      builderCode,
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
      const minPrice = expectPresent(market.trading.minimumTickSize);
      const minSize = expectPresent(market.trading.minimumOrderSize);

      const order = await secureClientWithDepositWallet.createLimitOrder({
        builderCode,
        postOnly: true,
        price: minPrice,
        side: OrderSide.BUY,
        size: minSize,
        tokenId: yesTokenId,
      });

      expect(order.postOnly).toBe(true);
      expect(order.builder).toBe(builderCode);
    });

    it('requests a collateral approval if necessary', async ({
      depositWalletAddress,
      depositWalletSigner,
      publicClient,
      relayerAuthentication,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
      const minPrice = expectPresent(market.trading.minimumTickSize);
      const minSize = expectPresent(market.trading.minimumOrderSize);
      const gaslessClient = await createSecureClient({
        apiKey: relayerAuthentication,
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
      });
      const exchangeAddress = await resolveExchangeAddressForToken(
        gaslessClient,
        yesTokenId,
      );

      await gaslessClient
        .approveErc20({
          amount: 0n,
          spenderAddress: exchangeAddress,
          tokenAddress: gaslessClient.environment.collateralToken,
        })
        .then((handle) => handle.wait());

      const response = await gaslessClient.placeLimitOrder({
        price: minPrice,
        side: OrderSide.BUY,
        size: minSize,
        tokenId: yesTokenId,
      });

      expect(response.ok).toBe(true);
      const acceptedResponse = expectAcceptedOrderResponse(response);

      const cancelResult = await gaslessClient.cancelOrder({
        orderId: acceptedResponse.orderId,
      });
      expect(cancelResult.canceled).toContain(acceptedResponse.orderId);
    });
  });

  describe('prepareLimitOrderPosting', () => {
    it('creates, signs, and posts a limit order in one workflow', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
      const minPrice = expectPresent(market.trading.minimumTickSize);
      const minSize = expectPresent(market.trading.minimumOrderSize);

      const response = await secureClientWithDepositWallet.placeLimitOrder({
        postOnly: true,
        price: minPrice,
        side: OrderSide.BUY,
        size: minSize,
        tokenId: yesTokenId,
      });

      expect(response.ok).toBe(true);
      const acceptedResponse = expectAcceptedOrderResponse(response);

      expect(acceptedResponse.status).toBe(OrderPostStatus.LIVE);
    });
  });

  describe('cancelOrder', () => {
    it('cancels a single open order', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const { orderId } = await createRestingLimitOrder(
        secureClientWithDepositWallet,
        market,
      );
      const result = await secureClientWithDepositWallet.cancelOrder({
        orderId,
      });

      expect(result.canceled).toContain(orderId);

      const { items } = await secureClientWithDepositWallet
        .listOpenOrders({
          market: market.id,
        })
        .firstPage();

      expect(items.some((order) => order.id === orderId)).toBe(false);
    });
  });

  describe('postOrders', () => {
    it('posts multiple resting limit orders', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const responses = await Promise.all([
        createSignedRestingLimitOrder(secureClientWithDepositWallet, market),
        createSignedRestingLimitOrder(secureClientWithDepositWallet, market),
      ]).then((orders) => secureClientWithDepositWallet.postOrders(orders));

      expect(responses).toHaveLength(2);
      expect(responses.every((response) => response.ok)).toBe(true);

      for (const response of responses) {
        const acceptedResponse = expectAcceptedOrderResponse(response);

        expect(acceptedResponse.orderId).not.toBe('');
        expect(acceptedResponse.status).toBe(OrderPostStatus.LIVE);
      }

      await secureClientWithDepositWallet.cancelAll();
    });
  });

  describe('cancelOrders', () => {
    it('cancels multiple open orders', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const firstOrder = await createRestingLimitOrder(
        secureClientWithDepositWallet,
        market,
      );
      const secondOrder = await createRestingLimitOrder(
        secureClientWithDepositWallet,
        market,
      );
      const result = await secureClientWithDepositWallet.cancelOrders({
        orderIds: [firstOrder.orderId, secondOrder.orderId],
      });

      expect(result.canceled).toEqual(
        expect.arrayContaining([firstOrder.orderId, secondOrder.orderId]),
      );
    });
  });

  describe('cancelAll', () => {
    it('cancels all open orders', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const order = await createRestingLimitOrder(
        secureClientWithDepositWallet,
        market,
      );
      const result = await secureClientWithDepositWallet.cancelAll();

      expect(result.canceled).toContain(order.orderId);
    });
  });

  describe('cancelMarketOrders', () => {
    it('cancels open orders for a market and asset', async ({
      publicClient,
      secureClientWithDepositWallet,
    }) => {
      const market = await findOrderMarket(publicClient);
      const order = await createRestingLimitOrder(
        secureClientWithDepositWallet,
        market,
      );
      const result = await cancelMarketOrderWithRetry(
        secureClientWithDepositWallet,
        market,
        order,
      );

      expect(result.canceled).toContain(order.orderId);
    });
  });
});

async function findOrderMarket(publicClient: PublicClient) {
  marketPromise ??= findHighVolumeLowPriceMarket(publicClient);

  return marketPromise;
}

async function createRestingLimitOrder(
  secureClient: SecureClient,
  market: Market,
): Promise<{
  tokenId: string;
  orderId: string;
}> {
  const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
  const tickSize = expectPresent(market.trading.minimumTickSize);
  const size = expectPresent(market.trading.minimumOrderSize);
  const response = await secureClient.placeLimitOrder({
    price: tickSize,
    side: OrderSide.BUY,
    size,
    tokenId: yesTokenId,
  });
  expect(response.ok).toBe(true);
  const acceptedResponse = expectAcceptedOrderResponse(response);

  expect(acceptedResponse.orderId).not.toBe('');
  expect(acceptedResponse.status).toBe(OrderPostStatus.LIVE);

  return {
    tokenId: expectPresent(market.outcomes.yes.tokenId),
    orderId: acceptedResponse.orderId,
  };
}

async function createSignedRestingLimitOrder(
  secureClient: SecureClient,
  market: Market,
) {
  const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
  const tickSize = expectPresent(market.trading.minimumTickSize);
  const size = expectPresent(market.trading.minimumOrderSize);

  return secureClient.createLimitOrder({
    price: tickSize,
    side: OrderSide.BUY,
    size,
    tokenId: yesTokenId,
  });
}

async function resolveExchangeAddressForToken(
  client: SecureClient,
  tokenId: string,
) {
  const negRisk = await fetchNegRisk(client, {
    tokenId,
  });

  return negRisk
    ? client.environment.negRiskExchange
    : client.environment.standardExchange;
}

async function cancelMarketOrderWithRetry(
  secureClient: SecureClient,
  market: Market,
  order: {
    tokenId: string;
    orderId: string;
  },
) {
  const conditionId = expectPresent(market.conditionId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await secureClient.cancelMarketOrders({
      tokenId: order.tokenId,
      market: conditionId,
    });

    if (result.canceled.includes(order.orderId)) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return secureClient.cancelMarketOrders({
    tokenId: order.tokenId,
    market: conditionId,
  });
}
