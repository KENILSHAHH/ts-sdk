import { type Market, MarketSchema } from '@polymarket/bindings';
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
 * ```
 */
export async function listMarkets(
  client: PolymarketClient,
  request: MarketsRequest = {},
): Promise<Market[]> {
  const parsedRequest = MarketsRequestSchema.parse(request);

  const response = await client.gamma
    .get('markets', {
      searchParams: toMarketsSearchParams(parsedRequest),
    })
    .json<unknown>();

  return MarketSchema.array().parse(response);
}

/**
 * Fetches a market.
 *
 * @example
 * ```ts
 * const market = await fetchMarket(client, {
 *   id: '12345',
 * });
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

  const response = await client.gamma
    .get(`markets/slug/${parsedParameters.slug}`)
    .json<unknown>();

  return MarketSchema.parse(response);
}

function toMarketsSearchParams(request: ParsedMarketsRequest): URLSearchParams {
  const searchParams = new URLSearchParams();

  function append(
    key: string,
    value: SearchParamPrimitive | readonly SearchParamPrimitive[] | undefined,
  ): void {
    if (value === undefined) {
      return;
    }

    const values: readonly SearchParamPrimitive[] = Array.isArray(value)
      ? value
      : [value];

    for (const item of values) {
      searchParams.append(key, toSearchParamValue(item));
    }
  }

  append('active', request.active);
  append('ascending', request.ascending);
  append('closed', request.closed);
  append('clob_token_ids', request.clobTokenIds);
  append('condition_ids', request.conditionIds);
  append('cyom', request.cyom);
  append('end_date_max', request.endDateMax);
  append('end_date_min', request.endDateMin);
  append('game_id', request.gameId);
  append('id', request.ids);
  append('include_tag', request.includeTag);
  append('limit', request.limit);
  append('liquidity_num_max', request.liquidityNumMax);
  append('liquidity_num_min', request.liquidityNumMin);
  append('market_maker_address', request.marketMakerAddresses);
  append('offset', request.offset);
  append('order', request.order);
  append('question_ids', request.questionIds);
  append('related_tags', request.relatedTags);
  append('rewards_min_size', request.rewardsMinSize);
  append('slug', request.slug);
  append('sports_market_types', request.sportsMarketTypes);
  append('start_date_max', request.startDateMax);
  append('start_date_min', request.startDateMin);
  append('tag_id', request.tagId);
  append('uma_resolution_status', request.umaResolutionStatus);
  append('volume_num_max', request.volumeNumMax);
  append('volume_num_min', request.volumeNumMin);

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
  const response = await client.gamma.get(`markets/${id}`).json<unknown>();

  return MarketSchema.parse(response);
}
