import { ListTeamsResponseSchema, type Team } from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
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

export type ListTeamsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists teams.
 *
 * @throws {@link ListTeamsError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const teams = await listTeams(client, {
 *   league: ['NBA'],
 *   limit: 10,
 * });
 *
 * // teams: Team[]
 * ```
 */
export async function listTeams(
  client: Client,
  request: ListTeamsRequest = {},
): Promise<Team[]> {
  const params = parseUserInput(request, ListTeamsRequestSchema);

  return unwrap(
    client.gamma
      .get('/teams', {
        params: toSearchParams(
          params,
          snakeCase({ providerId: 'provider_id' }),
        ),
      })
      .andThen(validateWith(ListTeamsResponseSchema)),
  );
}
