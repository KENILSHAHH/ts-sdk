import { z } from 'zod';
import { EvmAddressSchema, NotificationIdSchema } from '../shared';

function createCursorPageSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    count: z.number(),
    data: z.array(item),
    limit: z.number(),
    next_cursor: z.string(),
  });
}

export const ClosedOnlyModeSchema = z.object({
  closed_only: z.boolean(),
});

export type ClosedOnlyMode = z.infer<typeof ClosedOnlyModeSchema>;

export const OpenOrderSchema = z.object({
  asset_id: z.string(),
  associate_trades: z.array(z.string()),
  created_at: z.number(),
  expiration: z.string(),
  id: z.string(),
  maker_address: z.string(),
  market: z.string(),
  order_type: z.string(),
  original_size: z.string(),
  outcome: z.string(),
  owner: z.string(),
  price: z.string(),
  side: z.string(),
  size_matched: z.string(),
  status: z.string(),
});

export type OpenOrder = z.infer<typeof OpenOrderSchema>;

export const OpenOrdersPageSchema = createCursorPageSchema(OpenOrderSchema);

export type OpenOrdersPage = z.infer<typeof OpenOrdersPageSchema>;

export const MakerOrderSchema = z.object({
  asset_id: z.string(),
  fee_rate_bps: z.string(),
  maker_address: z.string(),
  matched_amount: z.string(),
  order_id: z.string(),
  outcome: z.string(),
  owner: z.string(),
  price: z.string(),
  side: z.string(),
});

export const ClobTradeSchema = z.object({
  asset_id: z.string(),
  bucket_index: z.number(),
  fee_rate_bps: z.string(),
  id: z.string(),
  last_update: z.string(),
  maker_address: z.string(),
  maker_orders: z.array(MakerOrderSchema),
  market: z.string(),
  match_time: z.string(),
  outcome: z.string(),
  owner: z.string(),
  price: z.string(),
  side: z.string(),
  size: z.string(),
  status: z.string(),
  taker_order_id: z.string(),
  trader_side: z.enum(['TAKER', 'MAKER']),
  transaction_hash: z.string(),
});

export type ClobTrade = z.infer<typeof ClobTradeSchema>;

export const ClobTradesPageSchema = createCursorPageSchema(ClobTradeSchema);

export type ClobTradesPage = z.infer<typeof ClobTradesPageSchema>;

export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  owner: z.string(),
  payload: z.unknown(),
  timestamp: z.string().or(z.number().int()),
  type: z.number(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsResponseSchema = z.array(NotificationSchema);

export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;

export enum AssetType {
  COLLATERAL = 'COLLATERAL',
  CONDITIONAL = 'CONDITIONAL',
}

export const AssetTypeSchema = z.enum(AssetType);

export const BalanceAllowanceResponseSchema = z.object({
  allowances: z.record(EvmAddressSchema, z.string().transform(BigInt)),
  balance: z.string(),
});

export type BalanceAllowanceResponse = z.infer<
  typeof BalanceAllowanceResponseSchema
>;

export const OrderScoringResponseSchema = z.object({
  scoring: z.boolean(),
});

export type OrderScoringResponse = z.infer<typeof OrderScoringResponseSchema>;

export const OrdersScoringResponseSchema = z.record(z.string(), z.boolean());

export type OrdersScoringResponse = z.infer<typeof OrdersScoringResponseSchema>;

export const UserEarningSchema = z.object({
  asset_address: z.string(),
  asset_rate: z.number(),
  condition_id: z.string(),
  date: z.string(),
  earnings: z.number(),
  maker_address: z.string(),
});

export type UserEarning = z.infer<typeof UserEarningSchema>;

export const UserEarningsPageSchema = createCursorPageSchema(UserEarningSchema);

export type UserEarningsPage = z.infer<typeof UserEarningsPageSchema>;

export const TotalUserEarningSchema = z.object({
  asset_address: z.string(),
  asset_rate: z.number(),
  date: z.string(),
  earnings: z.number(),
  maker_address: z.string(),
});

export type TotalUserEarning = z.infer<typeof TotalUserEarningSchema>;

export const TotalUserEarningsResponseSchema = z.array(TotalUserEarningSchema);

export type TotalUserEarningsResponse = z.infer<
  typeof TotalUserEarningsResponseSchema
>;

export const RewardsPercentagesSchema = z.record(z.string(), z.number());

export type RewardsPercentages = z.infer<typeof RewardsPercentagesSchema>;

export const TokenSchema = z.object({
  outcome: z.string(),
  price: z.number(),
  token_id: z.string(),
});

export const RewardsConfigSchema = z.object({
  asset_address: z.string(),
  end_date: z.string(),
  rate_per_day: z.number(),
  start_date: z.string(),
  total_rewards: z.number(),
});

export const EarningSchema = z.object({
  asset_address: z.string(),
  asset_rate: z.number(),
  earnings: z.number(),
});

export const UserRewardsEarningSchema = z.object({
  condition_id: z.string(),
  earning_percentage: z.number(),
  earnings: z.array(EarningSchema),
  event_slug: z.string(),
  image: z.string(),
  maker_address: z.string(),
  market_competitiveness: z.number(),
  market_slug: z.string(),
  question: z.string(),
  rewards_config: z.array(RewardsConfigSchema),
  rewards_max_spread: z.number(),
  rewards_min_size: z.number(),
  tokens: z.array(TokenSchema),
});

export type UserRewardsEarning = z.infer<typeof UserRewardsEarningSchema>;

export const UserRewardsEarningsPageSchema = createCursorPageSchema(
  UserRewardsEarningSchema,
);

export type UserRewardsEarningsPage = z.infer<
  typeof UserRewardsEarningsPageSchema
>;
