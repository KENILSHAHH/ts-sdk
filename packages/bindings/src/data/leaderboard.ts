import { z } from 'zod';
import { AddressSchema } from './common';

export const LeaderboardEntrySchema = z.looseObject({
  rank: z.string().nullish(),
  builder: z.string().nullish(),
  volume: z.number().nullish(),
  activeUsers: z.number().int().nullish(),
  verified: z.boolean().nullish(),
  builderLogo: z.string().nullish(),
});

export const BuilderVolumeEntrySchema = z.looseObject({
  dt: z.string().nullish(),
  builder: z.string().nullish(),
  builderLogo: z.string().nullish(),
  verified: z.boolean().nullish(),
  volume: z.number().nullish(),
  activeUsers: z.number().int().nullish(),
  rank: z.string().nullish(),
});

export const TraderLeaderboardEntrySchema = z.looseObject({
  rank: z.string().nullish(),
  proxyWallet: AddressSchema.nullish(),
  userName: z.string().nullish(),
  vol: z.number().nullish(),
  pnl: z.number().nullish(),
  profileImage: z.string().nullish(),
  xUsername: z.string().nullish(),
  verifiedBadge: z.boolean().nullish(),
});

export const ListBuilderLeaderboardResponseSchema = z.array(
  LeaderboardEntrySchema,
);
export const ListBuilderVolumeResponseSchema = z.array(
  BuilderVolumeEntrySchema,
);
export const ListTraderLeaderboardResponseSchema = z.array(
  TraderLeaderboardEntrySchema,
);

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type BuilderVolumeEntry = z.infer<typeof BuilderVolumeEntrySchema>;
export type TraderLeaderboardEntry = z.infer<
  typeof TraderLeaderboardEntrySchema
>;
export type ListBuilderLeaderboardResponse = z.infer<
  typeof ListBuilderLeaderboardResponseSchema
>;
export type ListBuilderVolumeResponse = z.infer<
  typeof ListBuilderVolumeResponseSchema
>;
export type ListTraderLeaderboardResponse = z.infer<
  typeof ListTraderLeaderboardResponseSchema
>;
