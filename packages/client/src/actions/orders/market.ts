import { EvmAddressSchema, type TickSizeValue } from '@polymarket/bindings';
import {
  type OrderBookLevel,
  OrderSide,
  OrderSideSchema,
  OrderType,
  type SignatureType,
} from '@polymarket/bindings/clob';
import { type EvmAddress, invariant } from '@polymarket/types';
import { z } from 'zod';
import type { SecureClient } from '../../clients';
import {
  fetchFeeRate,
  fetchNegRisk,
  fetchOrderBook,
  fetchTickSize,
} from '../clob';
import { fetchPublicProfile } from '../profiles';
import { resolveRoundingConfig } from './context';
import { decimalPlaces, parseAmount, roundDown, roundUp } from './math';
import type { PrepareMarketOrderRequest } from './types';

export const PrepareMarketOrderParamsSchema = z.object({
  tokenId: z.string(),
  amount: z.number().positive(),
  side: OrderSideSchema,
  taker: EvmAddressSchema.optional(),
  orderType: z
    .union([z.literal(OrderType.FAK), z.literal(OrderType.FOK)])
    .default(OrderType.FAK),
}) satisfies z.ZodType<PrepareMarketOrderRequest>;

export type PrepareMarketOrderDraftParams = z.output<
  typeof PrepareMarketOrderParamsSchema
>;

export type ResolveMarketOrderContextParams = {
  amount: number;
  orderType: OrderType;
  side: OrderSide;
  tokenId: string;
};

export type MarketOrderContext = {
  exchangeAddress: EvmAddress;
  feeRateBps: number;
  funderAddress: EvmAddress;
  negRisk: boolean;
  price: number;
  signatureType: SignatureType;
  signerAddress: EvmAddress;
  tickSize: TickSizeValue;
};

export type MarketOrderDraft = {
  chainId: number;
  exchangeAddress: EvmAddress;
  expiration: number;
  feeRateBps: number;
  funderAddress: EvmAddress;
  offeredAmount: bigint;
  orderType: OrderType;
  side: OrderSide;
  signatureType: SignatureType;
  signer: EvmAddress;
  allowedTaker?: EvmAddress;
  requestedAmount: bigint;
  tokenId: string;
};

type ResolvePriceParams = {
  amount: number;
  orderType: OrderType;
  side: OrderSide;
  tokenId: string;
  tickSize: TickSizeValue;
};

export async function prepareMarketOrderDraft(
  client: SecureClient,
  params: PrepareMarketOrderDraftParams,
): Promise<MarketOrderDraft> {
  const context = await resolveMarketOrderContext(client, params);
  const amounts = computeMarketOrderAmounts({
    amount: params.amount,
    price: context.price,
    side: params.side,
    tickSize: context.tickSize,
  });

  return {
    chainId: client.environment.chainId,
    exchangeAddress: context.exchangeAddress,
    expiration: 0,
    feeRateBps: context.feeRateBps,
    funderAddress: context.funderAddress,
    offeredAmount: amounts.makerAmount,
    orderType: params.orderType,
    side: params.side,
    signatureType: context.signatureType,
    signer: context.signerAddress,
    allowedTaker: params.taker,
    requestedAmount: amounts.takerAmount,
    tokenId: params.tokenId,
  };
}

export async function resolveMarketOrderContext(
  client: SecureClient,
  params: ResolveMarketOrderContextParams,
): Promise<MarketOrderContext> {
  const signerAddress = client.address;
  const signatureType = client.signatureType;
  const funderAddress = await resolveFunderAddress(client);
  const tickSize = await fetchTickSize(client, {
    tokenId: params.tokenId,
  });
  const feeRateBps = await resolveFeeRateBps(client, params.tokenId);
  const price = await resolvePrice(client, {
    amount: params.amount,
    orderType: params.orderType,
    side: params.side,
    tickSize,
    tokenId: params.tokenId,
  });
  const negRisk = await fetchNegRisk(client, {
    tokenId: params.tokenId,
  });

  return {
    exchangeAddress: resolveExchangeAddress(client, negRisk),
    feeRateBps,
    funderAddress,
    negRisk,
    price,
    signatureType,
    signerAddress,
    tickSize,
  };
}

export function computeMarketOrderAmounts(params: {
  amount: number;
  price: number;
  side: OrderSide;
  tickSize: TickSizeValue;
}): {
  makerAmount: bigint;
  takerAmount: bigint;
} {
  const roundConfig = resolveRoundingConfig(params.tickSize);
  const rawPrice = roundDown(params.price, roundConfig.price);
  const rawMakerAmount = roundDown(params.amount, roundConfig.size);

  if (params.side === OrderSide.BUY) {
    let rawTakerAmount = rawMakerAmount / rawPrice;

    if (decimalPlaces(rawTakerAmount) > roundConfig.amount) {
      rawTakerAmount = roundUp(rawTakerAmount, roundConfig.amount + 4);

      if (decimalPlaces(rawTakerAmount) > roundConfig.amount) {
        rawTakerAmount = roundDown(rawTakerAmount, roundConfig.amount);
      }
    }

    return {
      makerAmount: parseAmount(rawMakerAmount),
      takerAmount: parseAmount(rawTakerAmount),
    };
  }

  let rawTakerAmount = rawMakerAmount * rawPrice;

  if (decimalPlaces(rawTakerAmount) > roundConfig.amount) {
    rawTakerAmount = roundUp(rawTakerAmount, roundConfig.amount + 4);

    if (decimalPlaces(rawTakerAmount) > roundConfig.amount) {
      rawTakerAmount = roundDown(rawTakerAmount, roundConfig.amount);
    }
  }

  return {
    makerAmount: parseAmount(rawMakerAmount),
    takerAmount: parseAmount(rawTakerAmount),
  };
}

async function resolveFeeRateBps(
  client: SecureClient,
  tokenId: string,
): Promise<number> {
  return fetchFeeRate(client, {
    tokenId,
  });
}

async function resolveFunderAddress(client: SecureClient): Promise<EvmAddress> {
  const profile = await fetchPublicProfile(client, {
    address: client.address,
  });

  return profile.proxyWallet ?? client.address;
}

async function resolvePrice(
  client: SecureClient,
  params: ResolvePriceParams,
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

function resolveExchangeAddress(
  client: SecureClient,
  negRisk: boolean,
): EvmAddress {
  return negRisk
    ? client.environment.negRiskExchange
    : client.environment.standardExchange;
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
    throw new Error('no match');
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
    throw new Error('no match');
  }

  const bestPosition = positions[0];

  if (bestPosition === undefined) {
    throw new Error('no match');
  }

  return Number.parseFloat(bestPosition.price);
}

function calculateSellMarketPrice(
  positions: OrderBookLevel[],
  amountToMatch: number,
  orderType: OrderType,
): number {
  if (positions.length === 0) {
    throw new Error('no match');
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
    throw new Error('no match');
  }

  const bestPosition = positions[0];

  if (bestPosition === undefined) {
    throw new Error('no match');
  }

  return Number.parseFloat(bestPosition.price);
}
