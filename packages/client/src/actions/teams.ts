import { ListTeamsResponseSchema, type Team } from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import { parseUserInput } from '../input';
import { snakeCase, toSearchParams } from './params';

const ListTeamsRequestSchema = z.object({
  abbreviation: z.array(z.string()).optional(),
  ascending: z.boolean().optional(),
  league: z.array(z.string()).optional(),
  limit: z.number().int().optional(),
  name: z.array(z.string()).optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
  providerId: z.array(z.number().int()).optional(),
});

export type ListTeamsRequest = z.input<typeof ListTeamsRequestSchema>;

/**
 * Lists teams.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link ServerError}
 * Thrown if the request cannot be completed because of a network or server failure.
 *
 * @throws {@link InvalidResponseError}
 * Thrown if the server returns an unexpected response.
 *
 * @example
 * ```ts
 * const teams = await listTeams(client, {
 *   league: ['NBA'],
 *   limit: 10,
 * });
 *
 * // teams === Team[]
 * ```
 */
export async function listTeams(
  client: Client,
  request: ListTeamsRequest = {},
): Promise<Team[]> {
  const params = parseUserInput(request, ListTeamsRequestSchema);

  return unwrap(
    client.gamma.get('teams', {
      schema: ListTeamsResponseSchema,
      params: toSearchParams(params, snakeCase({ providerId: 'provider_id' })),
    }),
  );
}
