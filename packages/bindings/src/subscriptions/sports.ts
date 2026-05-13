import { z } from 'zod';
import { EpochMillisecondsToIsoDateTimeStringSchema } from '../shared';

const SportsResultPayloadSchema = z
  .object({
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
    finishedTimestamp: EpochMillisecondsToIsoDateTimeStringSchema.nullish(),
    finished_timestamp: EpochMillisecondsToIsoDateTimeStringSchema.nullish(),
    turn: z.string().nullish(),
  })
  .transform(({ finishedTimestamp, finished_timestamp, ...rest }) => ({
    ...rest,
    finishedAt: finishedTimestamp ?? finished_timestamp,
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
