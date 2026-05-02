import {
  type BuilderCode,
  BuilderCodeSchema,
  OrderSide,
  OrderType,
  PositiveDecimalNumberSchema,
  type TickSizeValue,
  TokenIdSchema,
} from '@polymarket/bindings';
import type { EvmAddress } from '@polymarket/types';
import { z } from 'zod';
import type { BaseSecureClient } from '../../clients';
import {
  fetchBuilderFeeRates,
  fetchClobMarketInfo,
  fetchMarketByToken,
  fetchNegRisk,
  fetchTickSize,
} from '../clob';
import { resolveExchangeAddress, resolveRoundingConfig } from './context';
import { resolveEstimatedMarketPrice } from './estimate';
import { decimalPlaces, parseAmount, roundDown, roundUp } from './math';
import type { OrderDraft, PrepareMarketOrderRequest } from './types';

const BasePrepareMarketOrderParamsSchema = z.object({
  tokenId: TokenIdSchema,
  builderCode: BuilderCodeSchema.optional(),
  orderType: z
    .union([z.literal(OrderType.FAK), z.literal(OrderType.FOK)])
    .default(OrderType.FAK),
});

export const PrepareMarketOrderParamsSchema = z.discriminatedUnion('side', [
  BasePrepareMarketOrderParamsSchema.extend({
    side: z.literal(OrderSide.BUY),
    amount: PositiveDecimalNumberSchema,
    maxSpend: PositiveDecimalNumberSchema.optional(),
  }),
  BasePrepareMarketOrderParamsSchema.extend({
    side: z.literal(OrderSide.SELL),
    shares: PositiveDecimalNumberSchema,
  }),
]) satisfies z.ZodType<PrepareMarketOrderRequest>;

export type PrepareMarketOrderDraftParams = z.output<
  typeof PrepareMarketOrderParamsSchema
>;

export async function prepareMarketOrderDraft(
  client: BaseSecureClient,
  params: PrepareMarketOrderDraftParams,
): Promise<OrderDraft> {
  const requestedAmount =
    params.side === OrderSide.BUY ? params.amount : params.shares;
  const context = await resolveMarketOrderContext(client, params);
  const amount = await resolveMarketOrderAmount(client, {
    amount: requestedAmount,
    builderCode: params.builderCode,
    maxSpend: params.side === OrderSide.BUY ? params.maxSpend : undefined,
    price: context.price,
    side: params.side,
    tokenId: params.tokenId,
  });
  const amounts = computeMarketOrderAmounts({
    amount,
    price: context.price,
    side: params.side,
    tickSize: context.tickSize,
  });

  return {
    builderCode: params.builderCode,
    chainId: client.environment.chainId,
    exchangeAddress: context.exchangeAddress,
    expiration: 0,
    funderAddress: context.funderAddress,
    offeredAmount: amounts.offeredAmount,
    orderType: params.orderType,
    side: params.side,
    signer: context.signerAddress,
    requestedAmount: amounts.requestedAmount,
    tokenId: params.tokenId,
  };
}

type ResolveMarketOrderContextParams =
  | {
      amount: number;
      orderType: OrderType;
      side: OrderSide.BUY;
      tokenId: string;
    }
  | {
      orderType: OrderType;
      shares: number;
      side: OrderSide.SELL;
      tokenId: string;
    };

type ResolveMarketOrderAmountParams = {
  amount: number;
  builderCode?: BuilderCode;
  maxSpend?: number;
  price: number;
  side: OrderSide;
  tokenId: string;
};

type MarketOrderContext = {
  exchangeAddress: EvmAddress;
  funderAddress: EvmAddress;
  negRisk: boolean;
  price: number;
  signerAddress: EvmAddress;
  tickSize: TickSizeValue;
};

async function resolveMarketOrderContext(
  client: BaseSecureClient,
  params: ResolveMarketOrderContextParams,
): Promise<MarketOrderContext> {
  const account = client.account;
  const tickSize = await fetchTickSize(client, {
    tokenId: params.tokenId,
  });
  const amount = params.side === OrderSide.BUY ? params.amount : params.shares;
  const price = await resolveEstimatedMarketPrice(client, {
    amount,
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
    funderAddress: account.wallet,
    negRisk,
    price,
    signerAddress: account.signer,
    tickSize,
  };
}

function computeMarketOrderAmounts(params: {
  amount: number;
  price: number;
  side: OrderSide;
  tickSize: TickSizeValue;
}): {
  offeredAmount: bigint;
  requestedAmount: bigint;
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
      offeredAmount: parseAmount(rawMakerAmount),
      requestedAmount: parseAmount(rawTakerAmount),
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
    offeredAmount: parseAmount(rawMakerAmount),
    requestedAmount: parseAmount(rawTakerAmount),
  };
}

async function resolveMarketOrderAmount(
  client: BaseSecureClient,
  params: ResolveMarketOrderAmountParams,
): Promise<number> {
  if (params.side !== OrderSide.BUY || params.maxSpend === undefined) {
    return params.amount;
  }

  const [feeInfo, builderTakerFeeRate] = await Promise.all([
    fetchMarketFeeInfo(client, params.tokenId),
    fetchBuilderTakerFeeRate(client, params.builderCode),
  ]);

  return adjustBuyAmountForFees({
    amount: params.amount,
    builderTakerFeeRate,
    feeExponent: feeInfo.exponent,
    feeRate: feeInfo.rate,
    maxSpend: params.maxSpend,
    price: params.price,
  });
}

type MarketFeeInfo = {
  rate: number;
  exponent: number;
};

async function fetchMarketFeeInfo(
  client: BaseSecureClient,
  tokenId: string,
): Promise<MarketFeeInfo> {
  const marketByToken = await fetchMarketByToken(client, { tokenId });
  const marketInfo = await fetchClobMarketInfo(client, {
    conditionId: marketByToken.conditionId,
  });

  return marketInfo.feeInfo;
}

async function fetchBuilderTakerFeeRate(
  client: BaseSecureClient,
  builderCode: BuilderCode | undefined,
): Promise<number> {
  if (builderCode === undefined) {
    return 0;
  }

  const builderFees = await fetchBuilderFeeRates(client, { builderCode });

  return builderFees.taker;
}

export function adjustBuyAmountForFees(params: {
  amount: number;
  price: number;
  maxSpend: number;
  feeRate: number;
  feeExponent: number;
  builderTakerFeeRate: number;
}): number {
  const platformFeeRate =
    params.feeRate * (params.price * (1 - params.price)) ** params.feeExponent;
  const platformFee = (params.amount / params.price) * platformFeeRate;
  const totalCost =
    params.amount + platformFee + params.amount * params.builderTakerFeeRate;

  if (params.maxSpend <= totalCost) {
    return (
      params.maxSpend /
      (1 + platformFeeRate / params.price + params.builderTakerFeeRate)
    );
  }

  return params.amount;
}
