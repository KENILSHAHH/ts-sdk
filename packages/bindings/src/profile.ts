import { z } from 'zod';

export const PublicProfileUserSchema = z.looseObject({
  id: z.string(),
  creator: z.boolean().nullish(),
  mod: z.boolean().nullish(),
});

export const PublicProfileSchema = z.looseObject({
  createdAt: z.string().nullish(),
  proxyWallet: z.string().nullish(),
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
export type PublicProfileUser = z.infer<typeof PublicProfileUserSchema>;
