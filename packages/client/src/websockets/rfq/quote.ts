import {
  OrderSide,
  type PositionId,
  PositiveDecimalNumberSchema,
} from '@polymarket/bindings';
import {
  RfqDirection,
  type RfqQuoteRequest,
  type RfqRequestedSize,
  RfqRequestedSizeUnit,
  type RfqSignedOrder,
} from '@polymarket/bindings/rfq';
import type { EvmAddress } from '@polymarket/types';
import { z } from 'zod';
import { decimalPlaces, parseAmount } from '../../actions/orders/math';
import type { RfqQuoteResponse, RfqQuoteSource } from '../../actions/rfq';
import { UserInputError } from '../../errors';
import { parseUserInput } from '../../input';
import type { Signer } from '../../types';
import type { AccountIdentity } from '../../wallet';
import { signRfqQuoteOrder } from './signing';

const RfqQuoteResponseSchema = z.strictObject({
  price: PositiveDecimalNumberSchema.refine((price) => price < 1, {
    message: 'Price must be less than 1.',
  }),
  size: PositiveDecimalNumberSchema.optional(),
  source: z.enum(['collateral', 'inventory']).default('collateral'),
}) satisfies z.ZodType<RfqQuoteResponse>;

type RfqQuoteParams = {
  price: number;
  size?: number;
  source: RfqQuoteSource;
};

export type CreateRfqQuoteParams = {
  account: AccountIdentity;
  chainId: number;
  exchange: EvmAddress;
  request: RfqQuoteRequest;
  response: RfqQuoteResponse;
  signer: Signer;
};

export type RfqQuote = {
  priceE6: number;
  signedOrder: RfqSignedOrder;
  sizeE6: number;
};

export async function createRfqQuote(
  params: CreateRfqQuoteParams,
): Promise<RfqQuote> {
  const response = parseUserInput(params.response, RfqQuoteResponseSchema);
  const quote = await createParsedRfqQuote({ ...params, response });

  return quote;
}

type CreateParsedRfqQuoteParams = Omit<CreateRfqQuoteParams, 'response'> & {
  response: RfqQuoteParams;
};

async function createParsedRfqQuote(
  params: CreateParsedRfqQuoteParams,
): Promise<RfqQuote> {
  const priceE6 = decimalToE6(params.response.price, 'RFQ quote price');
  const sizeE6 =
    params.response.size === undefined
      ? defaultQuoteSizeE6(params.request.requestedSize, priceE6)
      : decimalToE6(params.response.size, 'RFQ quote size');
  const signedOrder = await signRfqQuoteOrder({
    account: params.account,
    chainId: params.chainId,
    exchange: params.exchange,
    orderPriceE6: quoteOrderPriceE6(
      params.request,
      params.response.source,
      priceE6,
    ),
    orderSide: quoteOrderSide(params.response.source),
    signer: params.signer,
    sizeE6,
    tokenId: quoteOrderTokenId(params.request, params.response.source),
  });

  return { priceE6, signedOrder, sizeE6 };
}

function quoteOrderTokenId(
  request: RfqQuoteRequest,
  source: RfqQuoteSource,
): PositionId {
  if (request.direction === RfqDirection.Buy) {
    return source === 'collateral'
      ? request.noPositionId
      : request.yesPositionId;
  }

  return source === 'collateral' ? request.yesPositionId : request.noPositionId;
}

function quoteOrderPriceE6(
  request: RfqQuoteRequest,
  source: RfqQuoteSource,
  priceE6: number,
): number {
  const usesComplementPrice =
    (request.direction === RfqDirection.Buy && source === 'collateral') ||
    (request.direction === RfqDirection.Sell && source === 'inventory');

  return usesComplementPrice ? 1_000_000 - priceE6 : priceE6;
}

function quoteOrderSide(source: RfqQuoteSource): OrderSide {
  return source === 'collateral' ? OrderSide.BUY : OrderSide.SELL;
}

function defaultQuoteSizeE6(
  requestedSize: RfqRequestedSize,
  priceE6: number,
): number {
  const valueE6 = decimalStringToE6(requestedSize.value, 'RFQ requested size');

  if (requestedSize.unit === RfqRequestedSizeUnit.Shares) {
    return valueE6;
  }

  const sizeE6 = (BigInt(valueE6) * 1_000_000n) / BigInt(priceE6);

  if (sizeE6 > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new UserInputError('RFQ quote size is too large.');
  }

  return Number(sizeE6);
}

function decimalStringToE6(value: string, field: string): number {
  const [whole = '', fraction = ''] = value.split('.');

  if (fraction.length > 6) {
    throw new UserInputError(`${field} must have at most 6 decimal places.`);
  }

  const wireValue =
    BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));

  if (wireValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new UserInputError(`${field} is too large.`);
  }

  return Number(wireValue);
}

function decimalToE6(value: number, field: string): number {
  if (decimalPlaces(value) > 6) {
    throw new UserInputError(`${field} must have at most 6 decimal places.`);
  }

  const wireValue = parseAmount(value);

  if (wireValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new UserInputError(`${field} is too large.`);
  }

  return Number(wireValue);
}
