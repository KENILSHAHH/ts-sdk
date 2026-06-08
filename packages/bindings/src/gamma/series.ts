import { z } from 'zod';
import {
  CollectionReferenceSchema,
  EventSchema,
  SeriesReferenceSchema,
} from './event';
import { TagSchema } from './tag';

export const SeriesSchema = SeriesReferenceSchema.extend({
  events: z.array(EventSchema).nullish(),
  collections: z.array(CollectionReferenceSchema).nullish(),
  tags: z.array(TagSchema).nullish(),
});

export const ListSeriesResponseSchema = z.array(SeriesSchema);

export type Series = z.infer<typeof SeriesSchema>;
export type ListSeriesResponse = z.infer<typeof ListSeriesResponseSchema>;
