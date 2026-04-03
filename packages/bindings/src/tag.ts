import { z } from 'zod';
import { TagIdSchema, TagReferenceSchema } from './common';

export const TagSchema = TagReferenceSchema;

export const RelatedTagSchema = z.looseObject({
  id: z.string(),
  tagID: z.number().int().nullish(),
  relatedTagID: z.number().int().nullish(),
  rank: z.number().int().nullish(),
});

export const ListTagsResponseSchema = z.array(TagSchema);
export const ListRelatedTagsResponseSchema = z.array(RelatedTagSchema);
export const ListRelatedTagResourcesResponseSchema = z.array(TagSchema);

export type Tag = z.infer<typeof TagSchema>;
export type RelatedTag = z.infer<typeof RelatedTagSchema>;
export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
export type ListRelatedTagsResponse = z.infer<
  typeof ListRelatedTagsResponseSchema
>;
export type ListRelatedTagResourcesResponse = z.infer<
  typeof ListRelatedTagResourcesResponseSchema
>;

export { TagIdSchema };
