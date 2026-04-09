import { EvmAddressSchema, type TickSizeValue } from '@polymarket/bindings';
import {
  OrderSide,
  OrderSideSchema,
  OrderType,
} from '@polymarket/bindings/clob';
import type { EvmAddress } from '@polymarket/types';
import { z } from 'zod';
import type { SecureClient } from '../../clients';
import { UserInputError } from '../../errors';
import { fetchNegRisk, fetchTickSize } from '../clob';
import {
  resolveExchangeAddress,
  resolveFeeRateBps,
  resolveRoundingConfig,
} from './context';
import {
  decimalPlaces,
  parseAmount,
  roundDown,
  roundNormal,
  roundUp,
} from './math';
import type { OrderDraft, PrepareLimitOrderRequest } from './types';

export const PrepareLimitOrderParamsSchema = z
  .object({
    tokenId: z.string(),
    price: z.number().positive(),
    size: z.number().positive(),
    side: OrderSideSchema,
    taker: EvmAddressSchema.optional(),
    expiration: z.number().int().nonnegative().optional(),
    orderType: z
      .union([z.literal(OrderType.GTC), z.literal(OrderType.GTD)])
      .default(OrderType.GTC),
  })
  .superRefine((params, context) => {
    if (params.orderType === OrderType.GTD) {
      if (params.expiration === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'GTD orders require an expiration timestamp.',
          path: ['expiration'],
        });
        return;
      }

      const minimumExpiration = Math.floor(Date.now() / 1000) + 60;

      if (params.expiration <= minimumExpiration) {
        context.addIssue({
          code: 'custom',
          message: 'GTD expiration must be at least 60 seconds in the future.',
          path: ['expiration'],
        });
      }

      return;
    }

    if (params.expiration !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Expiration is only supported for GTD orders.',
        path: ['expiration'],
      });
    }
  }) satisfies z.ZodType<PrepareLimitOrderRequest>;

export type PrepareLimitOrderDraftParams = z.output<
  typeof PrepareLimitOrderParamsSchema
>;

type ResolveLimitOrderContextParams = {
  price: number;
  tokenId: string;
};

export async function prepareLimitOrderDraft(
  client: SecureClient,
  params: PrepareLimitOrderDraftParams,
): Promise<OrderDraft> {
  const context = await resolveLimitOrderContext(client, {
    price: params.price,
    tokenId: params.tokenId,
  });
  const amounts = computeLimitOrderAmounts({
    price: context.price,
    side: params.side,
    size: params.size,
    tickSize: context.tickSize,
  });

  return {
    chainId: client.environment.chainId,
    exchangeAddress: context.exchangeAddress,
    expiration: params.expiration ?? 0,
    feeRateBps: context.feeRateBps,
    funderAddress: context.funderAddress,
    offeredAmount: amounts.offeredAmount,
    orderType: params.orderType,
    side: params.side,
    signer: context.signerAddress,
    allowedTaker: params.taker,
    requestedAmount: amounts.requestedAmount,
    tokenId: params.tokenId,
  };
}

type LimitOrderContext = {
  exchangeAddress: EvmAddress;
  feeRateBps: number;
  funderAddress: EvmAddress;
  negRisk: boolean;
  price: number;
  signerAddress: EvmAddress;
  tickSize: TickSizeValue;
};

async function resolveLimitOrderContext(
  client: SecureClient,
  params: ResolveLimitOrderContextParams,
): Promise<LimitOrderContext> {
  const account = client.account;
  const tickSize = await fetchTickSize(client, {
    tokenId: params.tokenId,
  });
  const feeRateBps = await resolveFeeRateBps(client, params.tokenId);
  const negRisk = await fetchNegRisk(client, {
    tokenId: params.tokenId,
  });

  return {
    exchangeAddress: resolveExchangeAddress(client, negRisk),
    feeRateBps,
    funderAddress: account.wallet,
    negRisk,
    price: resolvePrice(params.price, tickSize),
    signerAddress: account.signer,
    tickSize,
  };
}

function computeLimitOrderAmounts(params: {
  price: number;
  side: OrderSide;
  size: number;
  tickSize: TickSizeValue;
}): {
  offeredAmount: bigint;
  requestedAmount: bigint;
} {
  const roundConfig = resolveRoundingConfig(params.tickSize);
  const rawPrice = roundNormal(params.price, roundConfig.price);

  if (params.side === OrderSide.BUY) {
    const rawTakerAmount = roundDown(params.size, roundConfig.size);
    let rawMakerAmount = rawTakerAmount * rawPrice;

    if (decimalPlaces(rawMakerAmount) > roundConfig.amount) {
      rawMakerAmount = roundUp(rawMakerAmount, roundConfig.amount + 4);

      if (decimalPlaces(rawMakerAmount) > roundConfig.amount) {
        rawMakerAmount = roundDown(rawMakerAmount, roundConfig.amount);
      }
    }

    return {
      offeredAmount: parseAmount(rawMakerAmount),
      requestedAmount: parseAmount(rawTakerAmount),
    };
  }

  const rawMakerAmount = roundDown(params.size, roundConfig.size);
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

function resolvePrice(price: number, tickSize: TickSizeValue): number {
  const roundConfig = resolveRoundingConfig(tickSize);

  if (price < tickSize || price > 1 - tickSize) {
    throw new UserInputError(
      `Price must be between ${tickSize} and ${1 - tickSize} for tick size ${tickSize}.`,
    );
  }

  if (decimalPlaces(price) > roundConfig.price) {
    throw new UserInputError(
      `Price must conform to tick size ${tickSize} with at most ${roundConfig.price} decimal places.`,
    );
  }

  return roundNormal(price, roundConfig.price);
}
