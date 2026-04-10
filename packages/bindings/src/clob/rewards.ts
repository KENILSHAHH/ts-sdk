import { z } from 'zod';
import { TokenIdSchema } from '../shared';

const CurrentRewardConfigSchema = z.looseObject({
  id: z.number().int().optional(),
  asset_address: z.string(),
  start_date: z.string(),
  end_date: z.string().optional(),
  rate_per_day: z.number(),
  total_rewards: z.number().optional(),
});
export type CurrentRewardConfig = z.infer<typeof CurrentRewardConfigSchema>;

export const CurrentRewardSchema = z.looseObject({
  condition_id: z.string(),
  rewards_max_spread: z.number().optional(),
  rewards_min_size: z.number().optional(),
  rewards_config: z.array(CurrentRewardConfigSchema).optional(),
  sponsored_daily_rate: z.number().optional(),
  sponsors_count: z.number().int().optional(),
  native_daily_rate: z.number().optional(),
  total_daily_rate: z.number().optional(),
});
export type CurrentReward = z.infer<typeof CurrentRewardSchema>;

export const PaginatedCurrentRewardsSchema = z.object({
  limit: z.number().int(),
  count: z.number().int(),
  next_cursor: z.string(),
  data: z.array(CurrentRewardSchema),
});
export type PaginatedCurrentRewards = z.infer<
  typeof PaginatedCurrentRewardsSchema
>;

const RewardTokenSchema = z.object({
  token_id: TokenIdSchema,
  outcome: z.string(),
  price: z.number(),
});
export type RewardToken = z.infer<typeof RewardTokenSchema>;

const RewardConfigSchema = z.looseObject({
  asset_address: z.string(),
  start_date: z.string(),
  end_date: z.string().optional(),
  rate_per_day: z.number(),
  total_rewards: z.number().optional(),
});
export type RewardConfig = z.infer<typeof RewardConfigSchema>;

export const MarketRewardSchema = z.looseObject({
  condition_id: z.string(),
  question: z.string(),
  market_slug: z.string().optional(),
  event_slug: z.string().optional(),
  image: z.string().optional(),
  rewards_max_spread: z.number().optional(),
  rewards_min_size: z.number().optional(),
  market_competitiveness: z.number().optional(),
  tokens: z.array(RewardTokenSchema),
  rewards_config: z.array(RewardConfigSchema).optional(),
});
export type MarketReward = z.infer<typeof MarketRewardSchema>;

export const PaginatedMarketRewardsSchema = z.object({
  limit: z.number().int(),
  count: z.number().int(),
  next_cursor: z.string(),
  data: z.array(MarketRewardSchema),
});
export type PaginatedMarketRewards = z.infer<
  typeof PaginatedMarketRewardsSchema
>;
