import { z } from 'zod';
import { TagIdSchema } from './common';
import { EventSchema } from './event';
import { ProfileSchema } from './profile';

export const SearchTagSchema = z.looseObject({
  id: TagIdSchema,
  event_count: z.number().int().nullish(),
  label: z.string().nullish(),
  slug: z.string().nullish(),
});

export const SearchPaginationSchema = z.looseObject({
  hasMore: z.boolean().nullish(),
  totalResults: z.number().int().nullish(),
});

export const PublicSearchResponseSchema = z.looseObject({
  events: z.array(EventSchema).nullish(),
  tags: z.array(SearchTagSchema).nullish(),
  profiles: z.array(ProfileSchema).nullish(),
  pagination: SearchPaginationSchema.nullish(),
});

export type SearchTag = z.infer<typeof SearchTagSchema>;
export type SearchPagination = z.infer<typeof SearchPaginationSchema>;
export type PublicSearchResponse = z.infer<typeof PublicSearchResponseSchema>;
