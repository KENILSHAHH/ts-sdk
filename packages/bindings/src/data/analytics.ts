import { z } from 'zod';
import { AddressSchema, Hash64Schema } from './common';

export const HolderSchema = z.looseObject({
  proxyWallet: AddressSchema.nullish(),
  bio: z.string().nullish(),
  asset: z.string().nullish(),
  pseudonym: z.string().nullish(),
  amount: z.number().nullish(),
  displayUsernamePublic: z.boolean().nullish(),
  outcomeIndex: z.number().int().nullish(),
  name: z.string().nullish(),
  profileImage: z.string().nullish(),
  profileImageOptimized: z.string().nullish(),
});

export const MetaHolderSchema = z.looseObject({
  token: z.string().nullish(),
  holders: z.array(HolderSchema).nullish(),
});

export const OpenInterestSchema = z.looseObject({
  market: Hash64Schema.nullish(),
  value: z.number().nullish(),
});

export const MarketVolumeSchema = z.looseObject({
  market: Hash64Schema.nullish(),
  value: z.number().nullish(),
});

export const LiveVolumeSchema = z.looseObject({
  total: z.number().nullish(),
  markets: z.array(MarketVolumeSchema).nullish(),
});

export const ListMarketHoldersResponseSchema = z.array(MetaHolderSchema);
export const ListOpenInterestResponseSchema = z.array(OpenInterestSchema);
export const FetchEventLiveVolumeResponseSchema = z.array(LiveVolumeSchema);

export type Holder = z.infer<typeof HolderSchema>;
export type MetaHolder = z.infer<typeof MetaHolderSchema>;
export type OpenInterest = z.infer<typeof OpenInterestSchema>;
export type MarketVolume = z.infer<typeof MarketVolumeSchema>;
export type LiveVolume = z.infer<typeof LiveVolumeSchema>;
export type ListMarketHoldersResponse = z.infer<
  typeof ListMarketHoldersResponseSchema
>;
export type ListOpenInterestResponse = z.infer<
  typeof ListOpenInterestResponseSchema
>;
export type FetchEventLiveVolumeResponse = z.infer<
  typeof FetchEventLiveVolumeResponseSchema
>;
