import {
  OrderSide,
  OrderSideSchema,
  OrderType,
  type TickSizeValue,
  TokenIdSchema,
} from '@polymarket/bindings';
import type { EvmAddress, HexString } from '@polymarket/types';
import { z } from 'zod';
import type { BaseSecureClient } from '../../clients';
import { fetchNegRisk, fetchTickSize } from '../clob';
import { resolveExchangeAddress, resolveRoundingConfig } from './context';
import { resolveEstimatedMarketPrice } from './estimate';
import { decimalPlaces, parseAmount, roundDown, roundUp } from './math';
import {
  isBytes32,
  type OrderDraft,
  type PrepareMarketOrderRequest,
} from './types';

export const PrepareMarketOrderParamsSchema = z.object({
  tokenId: TokenIdSchema,
  amount: z.number().positive(),
  side: OrderSideSchema,
  builderCode: z.custom<HexString>(isBytes32).optional(),
  orderType: z
    .union([z.literal(OrderType.FAK), z.literal(OrderType.FOK)])
    .default(OrderType.FAK),
}) satisfies z.ZodType<PrepareMarketOrderRequest>;

export type PrepareMarketOrderDraftParams = z.output<
  typeof PrepareMarketOrderParamsSchema
>;

export async function prepareMarketOrderDraft(
  client: BaseSecureClient,
  params: PrepareMarketOrderDraftParams,
): Promise<OrderDraft> {
  const context = await resolveMarketOrderContext(client, params);
  const amounts = computeMarketOrderAmounts({
    amount: params.amount,
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

type ResolveMarketOrderContextParams = {
  amount: number;
  orderType: OrderType;
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
  const price = await resolveEstimatedMarketPrice(client, {
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
