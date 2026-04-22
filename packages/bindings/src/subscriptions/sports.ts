import { z } from 'zod';

export const SportsResultEventSchema = z.looseObject({
  gameId: z.number().int(),
  sportradarGameId: z.string().nullish(),
  slug: z.string().nullish(),
  leagueAbbreviation: z.string(),
  homeTeam: z.string().nullish(),
  awayTeam: z.string().nullish(),
  status: z.string(),
  live: z.boolean(),
  ended: z.boolean(),
  score: z.string(),
  period: z.string().nullish(),
  elapsed: z.string().nullish(),
  finished_timestamp: z.string().nullish(),
  turn: z.string().nullish(),
});

export type SportsResultEvent = z.infer<typeof SportsResultEventSchema>;
