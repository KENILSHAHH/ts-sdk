import type { TickSizeValue } from '@polymarket/bindings';
import {
  type OrderBookLevel,
  OrderSide,
  OrderSideSchema,
  OrderType,
} from '@polymarket/bindings/clob';
import { invariant } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../../clients';
import {
  InsufficientLiquidityError,
  type RateLimitError,
  type RequestRejectedError,
  type TransportError,
  type UnexpectedResponseError,
  type UserInputError,
} from '../../errors';
import { parseUserInput } from '../../input';
import { fetchOrderBook, fetchTickSize } from '../clob';

const EstimateMarketPriceRequestSchema = z.object({
  tokenId: z.string(),
  amount: z.number().positive(),
  side: OrderSideSchema,
  orderType: z
    .union([z.literal(OrderType.FAK), z.literal(OrderType.FOK)])
    .default(OrderType.FOK),
});

export type EstimateMarketPriceRequest = z.input<
  typeof EstimateMarketPriceRequestSchema
>;

export type EstimateMarketPriceError =
  | InsufficientLiquidityError
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Estimates the price level a market order would cross at current book depth.
 *
 * For BUY orders, `amount` is the amount of collateral to spend. For SELL orders,
 * `amount` is the number of shares to sell.
 *
 * When `orderType` is `FOK`, this estimate requires enough resting liquidity to
 * satisfy the full requested amount and throws if the book is too thin. When
 * `orderType` is `FAK`, the estimate may fall back to the best currently
 * available price level even if the full requested amount cannot fill, so it
 * should be treated as a partial-fill execution estimate rather than a full-fill
 * guarantee.
 *
 * @example
 * ```ts
 * const price = await estimateMarketPrice(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *   side: OrderSide.BUY,
 *   amount: 10,
 * });
 *
 * // price === 0.53
 * ```
 *
 * @throws {@link EstimateMarketPriceError}
 * Thrown when the request is invalid, market data cannot be fetched or
 * validated, or the current order book cannot satisfy the requested execution
 * semantics.
 */
export async function estimateMarketPrice(
  client: Client,
  request: EstimateMarketPriceRequest,
): Promise<number> {
  const params = parseUserInput(request, EstimateMarketPriceRequestSchema);
  const tickSize = await fetchTickSize(client, {
    tokenId: params.tokenId,
  });

  return resolveEstimatedMarketPrice(client, {
    amount: params.amount,
    orderType: params.orderType,
    side: params.side,
    tickSize,
    tokenId: params.tokenId,
  });
}

/** @internal */
export async function resolveEstimatedMarketPrice(
  client: Client,
  params: {
    amount: number;
    orderType: OrderType;
    side: OrderSide;
    tokenId: string;
    tickSize: TickSizeValue;
  },
): Promise<number> {
  const orderBook = await fetchOrderBook(client, {
    tokenId: params.tokenId,
  });

  const price =
    params.side === OrderSide.BUY
      ? calculateBuyMarketPrice(orderBook.asks, params.amount, params.orderType)
      : calculateSellMarketPrice(
          orderBook.bids,
          params.amount,
          params.orderType,
        );

  invariant(
    isValidPrice(price, params.tickSize),
    `Resolved market price fell outside the valid range for tick size ${params.tickSize}.`,
  );

  return price;
}

function isValidPrice(price: number, tickSize: TickSizeValue): boolean {
  return price >= tickSize && price <= 1 - tickSize;
}

function calculateBuyMarketPrice(
  positions: OrderBookLevel[],
  amountToMatch: number,
  orderType: OrderType,
): number {
  if (positions.length === 0) {
    throw new InsufficientLiquidityError('No resting liquidity.');
  }

  let sum = 0;

  for (let index = positions.length - 1; index >= 0; index -= 1) {
    const position = positions[index];

    if (position === undefined) {
      continue;
    }

    sum += Number.parseFloat(position.size) * Number.parseFloat(position.price);

    if (sum >= amountToMatch) {
      return Number.parseFloat(position.price);
    }
  }

  if (orderType === OrderType.FOK) {
    throw new InsufficientLiquidityError(
      'Insufficient liquidity for full fill.',
    );
  }

  // biome-ignore lint/style/noNonNullAssertion: Checked for emptiness above.
  const bestPosition = positions[0]!;

  return Number.parseFloat(bestPosition.price);
}

function calculateSellMarketPrice(
  positions: OrderBookLevel[],
  amountToMatch: number,
  orderType: OrderType,
): number {
  if (positions.length === 0) {
    throw new InsufficientLiquidityError('No resting liquidity.');
  }

  let sum = 0;

  for (let index = positions.length - 1; index >= 0; index -= 1) {
    const position = positions[index];

    if (position === undefined) {
      continue;
    }

    sum += Number.parseFloat(position.size);

    if (sum >= amountToMatch) {
      return Number.parseFloat(position.price);
    }
  }

  if (orderType === OrderType.FOK) {
    throw new InsufficientLiquidityError(
      'Insufficient liquidity for full fill.',
    );
  }

  // biome-ignore lint/style/noNonNullAssertion: Checked for emptiness above.
  const bestPosition = positions[0]!;

  return Number.parseFloat(bestPosition.price);
}
