import { z } from 'zod';
import { EvmAddressSchema } from '../shared';
import { ImageOptimizationSchema } from './common';

export const PublicProfileUserSchema = z.looseObject({
  id: z.string(),
  communityMod: z.boolean().nullish(),
  creator: z.boolean().nullish(),
  mod: z.boolean().nullish(),
});

export const ProfileSchema = z.looseObject({
  id: z.string(),
  name: z.string().nullish(),
  user: z.number().int().nullish(),
  referral: z.string().nullish(),
  createdBy: z.number().int().nullish(),
  updatedBy: z.number().int().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  utmSource: z.string().nullish(),
  utmMedium: z.string().nullish(),
  utmCampaign: z.string().nullish(),
  utmContent: z.string().nullish(),
  utmTerm: z.string().nullish(),
  walletActivated: z.boolean().nullish(),
  pseudonym: z.string().nullish(),
  displayUsernamePublic: z.boolean().nullish(),
  profileImage: z.string().nullish(),
  bio: z.string().nullish(),
  proxyWallet: z.string().nullish(),
  profileImageOptimized: ImageOptimizationSchema.nullish(),
  isCloseOnly: z.boolean().nullish(),
  isCertReq: z.boolean().nullish(),
  certReqDate: z.string().nullish(),
  discordUsername: z.string().nullish(),
  xUsername: z.string().nullish(),
  verifiedBadge: z.boolean().nullish(),
  dubPartnerId: z.string().nullish(),
  termsAcceptedAt: z.string().nullish(),
  viewOnlyAcknowledgedAt: z.string().nullish(),
  isReferralRestricted: z.boolean().nullish(),
});

export const PublicProfileSchema = z.looseObject({
  createdAt: z.string().nullish(),
  proxyWallet: EvmAddressSchema.nullish(),
  profileImage: z.string().nullish(),
  displayUsernamePublic: z.boolean().nullish(),
  bio: z.string().nullish(),
  pseudonym: z.string().nullish(),
  name: z.string().nullish(),
  users: z.array(PublicProfileUserSchema).nullish(),
  xUsername: z.string().nullish(),
  verifiedBadge: z.boolean().nullish(),
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type PublicProfileUser = z.infer<typeof PublicProfileUserSchema>;
