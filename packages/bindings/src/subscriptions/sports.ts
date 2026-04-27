import { z } from 'zod';

const SportsResultPayloadSchema = z
  .looseObject({
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
  })
  .transform(({ finished_timestamp, ...rest }) => ({
    ...rest,
    finishedTimestamp: finished_timestamp,
  }));

export const SportsResultEventSchema = SportsResultPayloadSchema.transform(
  (payload) => {
    return {
      // Normalize to the shared subscription event envelope so mixed-stream
      // consumers can discriminate by `event.topic` and `event.type`.
      topic: 'sports' as const,
      type: 'sport_result' as const,
      payload,
    };
  },
);

export type SportsEvent = z.infer<typeof SportsResultEventSchema>;
