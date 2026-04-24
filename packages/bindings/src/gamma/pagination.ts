import { z } from 'zod';
import { PaginationCursorSchema } from '../shared';

export function createPageSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    items: z.array(item),
    next_cursor: PaginationCursorSchema.optional(),
  }).transform(({ next_cursor, ...rest }) => ({
    ...rest,
    nextCursor: next_cursor,
  }));
}

export const PaginationEnvelopeSchema = z.object({
  hasMore: z.boolean().nullish(),
  totalResults: z.number().int().nullish(),
});

export type PaginationEnvelope = z.infer<typeof PaginationEnvelopeSchema>;
