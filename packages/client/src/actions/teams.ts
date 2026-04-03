import { ListTeamsResponseSchema, type Team } from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const TeamsRequestSchema = z.object({
  abbreviation: z.array(z.string()).optional(),
  ascending: z.boolean().optional(),
  league: z.array(z.string()).optional(),
  limit: z.number().int().optional(),
  name: z.array(z.string()).optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
  providerId: z.array(z.number().int()).optional(),
});

export type TeamsRequest = z.input<typeof TeamsRequestSchema>;

export async function listTeams(
  client: PolymarketClient,
  request: TeamsRequest = {},
): Promise<Team[]> {
  const params = parseUserInput(request, TeamsRequestSchema);

  return unwrap(
    client.gamma.get('teams', {
      schema: ListTeamsResponseSchema,
      searchParams: toSearchParams(
        params,
        snakeCase({ providerId: 'provider_id' }),
      ),
    }),
  );
}
