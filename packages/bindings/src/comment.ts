import { z } from 'zod';
import { ImageOptimizationSchema } from './common';

export const CommentPositionSchema = z.looseObject({
  tokenId: z.string().nullish(),
  positionSize: z.string().nullish(),
});

export const CommentProfileSchema = z.looseObject({
  name: z.string().nullish(),
  pseudonym: z.string().nullish(),
  displayUsernamePublic: z.boolean().nullish(),
  bio: z.string().nullish(),
  isMod: z.boolean().nullish(),
  isCreator: z.boolean().nullish(),
  proxyWallet: z.string().nullish(),
  baseAddress: z.string().nullish(),
  profileImage: z.string().nullish(),
  profileImageOptimized: ImageOptimizationSchema.nullish(),
  positions: z.array(CommentPositionSchema).nullish(),
});

export const ReactionSchema = z.looseObject({
  id: z.string(),
  commentID: z.number().int().nullish(),
  reactionType: z.string().nullish(),
  icon: z.string().nullish(),
  userAddress: z.string().nullish(),
  createdAt: z.string().nullish(),
  profile: CommentProfileSchema.nullish(),
});

export const CommentMediaSchema = z.looseObject({
  id: z.string(),
  commentID: z.number().int().nullish(),
  provider: z.string().nullish(),
  providerMediaId: z.string().nullish(),
  url: z.string().nullish(),
  mediaType: z.string().nullish(),
  altText: z.string().nullish(),
  createdAt: z.string().nullish(),
});

export const CommentSchema = z.looseObject({
  id: z.string(),
  body: z.string().nullish(),
  parentEntityType: z.string().nullish(),
  parentEntityID: z.number().int().nullish(),
  parentCommentID: z.string().nullish(),
  userAddress: z.string().nullish(),
  replyAddress: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  media: z.array(CommentMediaSchema).nullish(),
  profile: CommentProfileSchema.nullish(),
  reactions: z.array(ReactionSchema).nullish(),
  reportCount: z.number().int().nullish(),
  reactionCount: z.number().int().nullish(),
  tradeAsset: z.string().nullish(),
});

export const ListCommentsResponseSchema = z.array(CommentSchema);

export type Comment = z.infer<typeof CommentSchema>;
export type CommentMedia = z.infer<typeof CommentMediaSchema>;
export type CommentPosition = z.infer<typeof CommentPositionSchema>;
export type CommentProfile = z.infer<typeof CommentProfileSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type ListCommentsResponse = z.infer<typeof ListCommentsResponseSchema>;
