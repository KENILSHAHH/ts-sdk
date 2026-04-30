import { z } from 'zod';

export const AddressSchema = z.string();
export const Hash64Schema = z.string();

export const ActivityTypeSchema = z.enum([
  'TRADE',
  'SPLIT',
  'MERGE',
  'REDEEM',
  'REWARD',
  'CONVERSION',
  'MAKER_REBATE',
  'REFERRAL_REWARD',
  'YIELD',
]);

export const SideSchema = z.enum(['BUY', 'SELL']);

export const TimePeriodSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'ALL']);

export const LeaderboardCategorySchema = z.enum([
  'OVERALL',
  'POLITICS',
  'SPORTS',
  'CRYPTO',
  'CULTURE',
  'MENTIONS',
  'WEATHER',
  'ECONOMICS',
  'TECH',
  'FINANCE',
]);

export const LeaderboardOrderBySchema = z.enum(['PNL', 'VOL']);

export type Address = z.infer<typeof AddressSchema>;
export type Hash64 = z.infer<typeof Hash64Schema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type Side = z.infer<typeof SideSchema>;
export type TimePeriod = z.infer<typeof TimePeriodSchema>;
export type LeaderboardCategory = z.infer<typeof LeaderboardCategorySchema>;
export type LeaderboardOrderBy = z.infer<typeof LeaderboardOrderBySchema>;
