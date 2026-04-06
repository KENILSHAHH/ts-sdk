import { ListTeamsResponseSchema, type Team } from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
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
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
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
    client.gamma
      .get('teams', {
        params: toSearchParams(
          params,
          snakeCase({ providerId: 'provider_id' }),
        ),
      })
      .andThen(validateWith(ListTeamsResponseSchema)),
  );
}
