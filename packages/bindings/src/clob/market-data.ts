import { z } from 'zod';
import { OrderSideSchema, TokenIdSchema } from '../shared';

export enum PriceHistoryInterval {
  MAX = 'max',
  ONE_WEEK = '1w',
  ONE_DAY = '1d',
  SIX_HOURS = '6h',
  ONE_HOUR = '1h',
}

export const PriceHistoryIntervalSchema = z.enum(PriceHistoryInterval);

export const MidpointSchema = z.looseObject({
  mid: z.string(),
});
export type Midpoint = z.infer<typeof MidpointSchema>;

export const MidpointsSchema = z.record(z.string(), z.string());
export type Midpoints = z.infer<typeof MidpointsSchema>;

export const PriceSchema = z.looseObject({
  price: z.string(),
});
export type Price = z.infer<typeof PriceSchema>;

const PricesBySideSchema = z.record(OrderSideSchema, z.string().optional());
export type PricesBySide = z.infer<typeof PricesBySideSchema>;

export const PricesSchema = z.record(z.string(), PricesBySideSchema);
export type Prices = z.infer<typeof PricesSchema>;

export const SpreadSchema = z.looseObject({
  spread: z.string(),
});
export type Spread = z.infer<typeof SpreadSchema>;

export const SpreadsSchema = z.record(z.string(), z.string());
export type Spreads = z.infer<typeof SpreadsSchema>;

export const LastTradePriceSchema = z.looseObject({
  price: z.string(),
  side: OrderSideSchema,
});
export type LastTradePrice = z.infer<typeof LastTradePriceSchema>;

const LastTradePriceForTokenResponseSchema = z
  .object({
    price: z.string(),
    side: OrderSideSchema,
    token_id: TokenIdSchema,
  })
  .transform(({ token_id, price, side }) => ({
    tokenId: token_id,
    price,
    side,
  }));
export type LastTradePriceForTokenResponse = z.infer<
  typeof LastTradePriceForTokenResponseSchema
>;

const LastTradePriceForTokenSchema = z.object({
  tokenId: TokenIdSchema,
  price: z.string(),
  side: OrderSideSchema,
});
export type LastTradePriceForToken = z.infer<
  typeof LastTradePriceForTokenSchema
>;

export const LastTradePricesSchema = z.array(
  LastTradePriceForTokenResponseSchema,
);
export type LastTradePrices = z.infer<typeof LastTradePricesSchema>;

const PriceHistoryPointSchema = z.object({
  t: z.number().int(),
  p: z.number(),
});
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>;

export const PriceHistorySchema = z.looseObject({
  history: z.array(PriceHistoryPointSchema),
});
export type PriceHistory = z.infer<typeof PriceHistorySchema>;
