import { type Market, MarketSchema } from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { PolymarketClient } from '../PolymarketClient';

type SearchParamPrimitive = boolean | number | string;

const ISODateStringSchema = z.string().or(z.date().transform(toISODateString));

const MarketsRequestSchema = z.object({
  active: z.boolean().optional(),
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  clobTokenIds: z.array(z.string()).optional(),
  conditionIds: z.array(z.string()).optional(),
  cyom: z.boolean().optional(),
  endDateMax: ISODateStringSchema.optional(),
  endDateMin: ISODateStringSchema.optional(),
  gameId: z.string().optional(),
  ids: z.array(z.number()).optional(),
  includeTag: z.boolean().optional(),
  limit: z.number().optional(),
  liquidityNumMax: z.number().optional(),
  liquidityNumMin: z.number().optional(),
  marketMakerAddresses: z.array(z.string()).optional(),
  offset: z.number().optional(),
  order: z.string().optional(),
  questionIds: z.array(z.string()).optional(),
  relatedTags: z.boolean().optional(),
  rewardsMinSize: z.number().optional(),
  slug: z.array(z.string()).optional(),
  sportsMarketTypes: z.array(z.string()).optional(),
  startDateMax: ISODateStringSchema.optional(),
  startDateMin: ISODateStringSchema.optional(),
  tagId: z.number().optional(),
  umaResolutionStatus: z.string().optional(),
  volumeNumMax: z.number().optional(),
  volumeNumMin: z.number().optional(),
});

export type MarketsRequest = z.input<typeof MarketsRequestSchema>;

const FetchMarketParametersSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ slug: z.string() }),
]);

export type FetchMarketParameters = z.input<typeof FetchMarketParametersSchema>;

type ParsedMarketsRequest = z.output<typeof MarketsRequestSchema>;

/**
 * Lists markets.
 *
 * @example
 * ```ts
 * const result = await listMarkets(client, {
 *   limit: 10,
 *   closed: false,
 * });
 * 
 * // result === Market[]
 * ```
 */
export async function listMarkets(
  client: PolymarketClient,
  request: MarketsRequest = {},
): Promise<Market[]> {
  const parsedRequest = MarketsRequestSchema.parse(request);

  return unwrap(
    client.gamma
      .get('markets', toMarketsSearchParams(parsedRequest))
      .map((response) => MarketSchema.array().parse(response)),
  );
}

/**
 * Fetches a market.
 *
 * @example
 * ```ts
 * const market = await fetchMarket(client, {
 *   id: '12345',
 * });
 * 
 * // market === Market
 * ```
 */
export async function fetchMarket(
  client: PolymarketClient,
  parameters: FetchMarketParameters,
): Promise<Market> {
  const parsedParameters = FetchMarketParametersSchema.parse(parameters);

  if ('id' in parsedParameters) {
    return getMarketById(client, parsedParameters.id);
  }

  return unwrap(
    client.gamma
      .get(`markets/slug/${parsedParameters.slug}`)
      .map((response) => MarketSchema.parse(response)),
  );
}

function toMarketsSearchParams(request: ParsedMarketsRequest): URLSearchParams {
  const searchParams = new URLSearchParams();

  const entries = [
    ['active', request.active],
    ['ascending', request.ascending],
    ['closed', request.closed],
    ['clob_token_ids', request.clobTokenIds],
    ['condition_ids', request.conditionIds],
    ['cyom', request.cyom],
    ['end_date_max', request.endDateMax],
    ['end_date_min', request.endDateMin],
    ['game_id', request.gameId],
    ['id', request.ids],
    ['include_tag', request.includeTag],
    ['limit', request.limit],
    ['liquidity_num_max', request.liquidityNumMax],
    ['liquidity_num_min', request.liquidityNumMin],
    ['market_maker_address', request.marketMakerAddresses],
    ['offset', request.offset],
    ['order', request.order],
    ['question_ids', request.questionIds],
    ['related_tags', request.relatedTags],
    ['rewards_min_size', request.rewardsMinSize],
    ['slug', request.slug],
    ['sports_market_types', request.sportsMarketTypes],
    ['start_date_max', request.startDateMax],
    ['start_date_min', request.startDateMin],
    ['tag_id', request.tagId],
    ['uma_resolution_status', request.umaResolutionStatus],
    ['volume_num_max', request.volumeNumMax],
    ['volume_num_min', request.volumeNumMin],
  ] as const satisfies ReadonlyArray<
    readonly [
      string,
      SearchParamPrimitive | readonly SearchParamPrimitive[] | undefined,
    ]
  >;

  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, toSearchParamValue(item));
      }

      continue;
    }

    searchParams.append(key, toSearchParamValue(value));
  }

  return searchParams;
}

function toSearchParamValue(value: SearchParamPrimitive): string {
  return String(value);
}

function toISODateString(value: Date): string {
  return value.toISOString();
}

async function getMarketById(
  client: PolymarketClient,
  id: string,
): Promise<Market> {
  return unwrap(
    client.gamma
      .get(`markets/${id}`)
      .map((response) => MarketSchema.parse(response)),
  );
}
