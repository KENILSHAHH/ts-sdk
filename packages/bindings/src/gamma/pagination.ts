import { z } from 'zod';

export const PaginationEnvelopeSchema = z.object({
  hasMore: z.boolean().nullish(),
  totalResults: z.number().int().nullish(),
});

export type PaginationEnvelope = z.infer<typeof PaginationEnvelopeSchema>;
