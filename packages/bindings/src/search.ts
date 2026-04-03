import { z } from 'zod';
import { TagIdSchema } from './common';
import { EventSchema } from './event';
import { PublicProfileSchema } from './profile';

export const SearchTagSchema = z.looseObject({
  id: TagIdSchema,
  label: z.string().nullish(),
  eventCount: z.number().int().nullish(),
});

export const SearchPaginationSchema = z.looseObject({
  hasMore: z.boolean().nullish(),
});

export const PublicSearchResponseSchema = z.looseObject({
  events: z.array(EventSchema).nullish(),
  tags: z.array(SearchTagSchema).nullish(),
  profiles: z.array(PublicProfileSchema).nullish(),
  pagination: SearchPaginationSchema.nullish(),
});

export type SearchTag = z.infer<typeof SearchTagSchema>;
export type SearchPagination = z.infer<typeof SearchPaginationSchema>;
export type PublicSearchResponse = z.infer<typeof PublicSearchResponseSchema>;
