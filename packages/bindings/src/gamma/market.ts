import { z } from 'zod';
import {
  type ConditionId,
  ConditionIdSchema,
  type EventId,
  EventIdSchema,
  type EvmAddress,
  EvmAddressSchema,
  IsoCalendarDateStringSchema,
  type IsoDateTimeString,
  IsoDateTimeStringSchema,
  type MarketId,
  MarketIdSchema,
  MixedDateTimeStringSchema,
  PaginationCursorSchema,
  type QuestionId,
  QuestionIdSchema,
  type ResolutionRequestId,
  ResolutionRequestIdSchema,
  type TagId,
  type TickSizeValue,
  TickSizeValueSchema,
  type TokenId,
  TokenIdSchema,
} from '../shared';
import {
  CategoryReferenceSchema,
  type ClobRewards,
  ClobRewardsSchema,
  type FeeSchedule,
  FeeScheduleSchema,
  ImageOptimizationSchema,
  InternalUserSchema,
  RelatedMarketSchema,
  TagReferenceSchema,
} from './common';

const StringPairSchema = z.tuple([z.string(), z.string()]);
const TokenIdPairValueSchema = z.tuple([TokenIdSchema, TokenIdSchema]);
const EmptyArraySchema = z.tuple([]).transform(() => null);
const GammaMarketEventSchema = z.looseObject({
  id: EventIdSchema,
  slug: z.string().nullish(),
  title: z.string().nullish(),
});

const OutcomePairSchema = z.preprocess(parseJsonString, StringPairSchema);

const OutcomePricePairSchema = z
  .preprocess(
    parseJsonString,
    z.union([StringPairSchema, EmptyArraySchema, z.null(), z.undefined()]),
  )
  .transform((value) => value ?? null);

const TokenIdPairSchema = z
  .preprocess(
    parseJsonString,
    z.union([
      TokenIdPairValueSchema,
      EmptyArraySchema,
      z.null(),
      z.undefined(),
    ]),
  )
  .transform((value) => value ?? null);

export enum UmaResolutionStatus {
  Proposed = 'proposed',
  Disputed = 'disputed',
  Resolved = 'resolved',
}

export type MarketState = {
  active?: boolean | null;
  closed?: boolean | null;
  archived?: boolean | null;
  acceptingOrders?: boolean | null;
  enableOrderBook?: boolean | null;
  negRisk?: boolean | null;
  startDate?: IsoDateTimeString | null;
  endDate?: IsoDateTimeString | null;
  closedTime?: IsoDateTimeString | null;
};

export type MarketOutcome = {
  label: string;
  tokenId: TokenId | null;
  price: string | null;
};

export type MarketOutcomes = {
  yes: MarketOutcome;
  no: MarketOutcome;
};

export type MarketMetrics = {
  volume?: string | null;
  volumeNum?: number | null;
  volume24hr?: number | null;
  volume1wk?: number | null;
  volume1mo?: number | null;
  volume1yr?: number | null;
  volumeAmm?: number | null;
  volumeClob?: number | null;
  liquidity?: string | null;
  liquidityNum?: number | null;
  liquidityClob?: number | null;
};

export type MarketPrices = {
  bestBid?: number | null;
  bestAsk?: number | null;
  lastTradePrice?: number | null;
  spread?: number | null;
  oneHourPriceChange?: number | null;
  oneDayPriceChange?: number | null;
  oneWeekPriceChange?: number | null;
  oneMonthPriceChange?: number | null;
  oneYearPriceChange?: number | null;
};

export type MarketTrading = {
  minimumOrderSize?: number | null;
  minimumTickSize?: TickSizeValue | null;
  secondsDelay?: number | null;
  feesEnabled?: boolean | null;
  feeType?: string | null;
  feeSchedule?: FeeSchedule | null;
};

export type MarketResolution = {
  questionId: QuestionId | null;
  negRiskRequestId: ResolutionRequestId | null;
  umaResolutionStatus?: string | null;
  source?: string | null;
  resolvedBy: EvmAddress | null;
};

export type MarketRewards = {
  clobRewards?: ClobRewards[] | null;
  rewardsMinSize?: number | null;
  rewardsMaxSpread?: number | null;
  holdingRewardsEnabled?: boolean | null;
};

export type MarketSportsMetadata = {
  sportsMarketType?: string | null;
  line?: number | null;
  gameId?: string | null;
  gameStartTime?: IsoDateTimeString | null;
};

export type MarketEvent = {
  id: EventId;
  slug: string | null;
  title: string | null;
};

export type MarketTag = {
  id: TagId;
  slug?: string | null;
  label?: string | null;
};

export type Market = {
  id: MarketId;
  slug?: string | null;
  conditionId: ConditionId;
  question?: string | null;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  icon?: string | null;
  state: MarketState;
  outcomes: MarketOutcomes;
  metrics: MarketMetrics;
  prices: MarketPrices;
  trading: MarketTrading;
  resolution: MarketResolution;
  rewards: MarketRewards;
  sports: MarketSportsMetadata;
  events: MarketEvent[];
  tags: MarketTag[];
};

export const GammaMarketSchema = z.looseObject({
  id: MarketIdSchema,
  question: z.string().nullish(),
  conditionId: ConditionIdSchema,
  slug: z.string().nullish(),
  twitterCardImage: z.string().nullish(),
  resolutionSource: z.string().nullish(),
  endDate: IsoDateTimeStringSchema.nullish(),
  category: z.string().nullish(),
  ammType: z.string().nullish(),
  liquidity: z.string().nullish(),
  sponsorName: z.string().nullish(),
  sponsorImage: z.string().nullish(),
  startDate: IsoDateTimeStringSchema.nullish(),
  xAxisValue: z.string().nullish(),
  yAxisValue: z.string().nullish(),
  denominationToken: z.string().nullish(),
  fee: z.string().nullish(),
  image: z.string().nullish(),
  icon: z.string().nullish(),
  lowerBound: z.string().nullish(),
  upperBound: z.string().nullish(),
  description: z.string().nullish(),
  outcomes: OutcomePairSchema,
  outcomePrices: OutcomePricePairSchema,
  volume: z.string().nullish(),
  active: z.boolean().nullish(),
  marketType: z.string().nullish(),
  formatType: z.string().nullish(),
  lowerBoundDate: IsoCalendarDateStringSchema.nullish(),
  upperBoundDate: IsoCalendarDateStringSchema.nullish(),
  closed: z.boolean().nullish(),
  marketMakerAddress: z.string(),
  createdBy: z.number().int().nullish(),
  updatedBy: z.number().int().nullish(),
  createdAt: IsoDateTimeStringSchema.nullish(),
  updatedAt: IsoDateTimeStringSchema.nullish(),
  closedTime: IsoDateTimeStringSchema.nullish(),
  wideFormat: z.boolean().nullish(),
  new: z.boolean().nullish(),
  sentDiscord: z.boolean().nullish(),
  mailchimpTag: z.string().nullish(),
  featured: z.boolean().nullish(),
  submitted_by: z.string().nullish(),
  subcategory: z.string().nullish(),
  categoryMailchimpTag: z.string().nullish(),
  twitterCardLocation: z.string().nullish(),
  twitterCardLastRefreshed: IsoDateTimeStringSchema.nullish(),
  twitterCardLastValidated: IsoDateTimeStringSchema.nullish(),
  archived: z.boolean().nullish(),
  resolvedBy: z.string().nullish(),
  restricted: z.boolean().nullish(),
  marketGroup: z.number().int().nullish(),
  groupItemTitle: z.string().nullish(),
  groupItemThreshold: z.string().nullish(),
  questionID: z.string().nullish(),
  umaEndDate: MixedDateTimeStringSchema.nullish(),
  enableOrderBook: z.boolean().nullish(),
  orderPriceMinTickSize: TickSizeValueSchema.nullish(),
  orderMinSize: z.number().nullish(),
  umaResolutionStatus: z.string().nullish(),
  curationOrder: z.number().int().nullish(),
  volumeNum: z.number().nullish(),
  liquidityNum: z.number().nullish(),
  endDateIso: IsoCalendarDateStringSchema.nullish(),
  startDateIso: IsoCalendarDateStringSchema.nullish(),
  umaEndDateIso: IsoCalendarDateStringSchema.nullish(),
  hasReviewedDates: z.boolean().nullish(),
  readyForCron: z.boolean().nullish(),
  commentsEnabled: z.boolean().nullish(),
  volume24hr: z.number().nullish(),
  volume1wk: z.number().nullish(),
  volume1mo: z.number().nullish(),
  volume1yr: z.number().nullish(),
  gameStartTime: IsoDateTimeStringSchema.nullish(),
  secondsDelay: z.number().int().nullish(),
  clobTokenIds: TokenIdPairSchema,
  disqusThread: z.string().nullish(),
  shortOutcomes: z.string().nullish(),
  teamAID: z.string().nullish(),
  teamBID: z.string().nullish(),
  umaBond: z.string().nullish(),
  umaReward: z.string().nullish(),
  fpmmLive: z.boolean().nullish(),
  volume24hrAmm: z.number().nullish(),
  volume1wkAmm: z.number().nullish(),
  volume1moAmm: z.number().nullish(),
  volume1yrAmm: z.number().nullish(),
  volume24hrClob: z.number().nullish(),
  volume1wkClob: z.number().nullish(),
  volume1moClob: z.number().nullish(),
  volume1yrClob: z.number().nullish(),
  volumeAmm: z.number().nullish(),
  volumeClob: z.number().nullish(),
  liquidityAmm: z.number().nullish(),
  liquidityClob: z.number().nullish(),
  makerBaseFee: z.number().int().nullish(),
  takerBaseFee: z.number().int().nullish(),
  customLiveness: z.number().int().nullish(),
  acceptingOrders: z.boolean().nullish(),
  negRisk: z.boolean().nullish(),
  negRiskMarketID: z.string().nullish(),
  negRiskRequestID: z.string().nullish(),
  notificationsEnabled: z.boolean().nullish(),
  score: z.number().int().nullish(),
  imageOptimized: ImageOptimizationSchema.nullish(),
  iconOptimized: ImageOptimizationSchema.nullish(),
  events: z.array(GammaMarketEventSchema).nullish(),
  categories: z.array(CategoryReferenceSchema).nullish(),
  markets: z.array(RelatedMarketSchema).nullish(),
  creator: z.string().nullish(),
  ready: z.boolean().nullish(),
  funded: z.boolean().nullish(),
  pastSlugs: z.string().nullish(),
  readyTimestamp: IsoDateTimeStringSchema.nullish(),
  fundedTimestamp: IsoDateTimeStringSchema.nullish(),
  acceptingOrdersTimestamp: IsoDateTimeStringSchema.nullish(),
  tags: z.array(TagReferenceSchema).nullish(),
  cyom: z.boolean().nullish(),
  competitive: z.number().nullish(),
  pagerDutyNotificationEnabled: z.boolean().nullish(),
  approved: z.boolean().nullish(),
  clobRewards: z.array(ClobRewardsSchema).nullish(),
  rewardsMinSize: z.number().nullish(),
  rewardsMaxSpread: z.number().nullish(),
  spread: z.number().nullish(),
  automaticallyResolved: z.boolean().nullish(),
  oneDayPriceChange: z.number().nullish(),
  oneHourPriceChange: z.number().nullish(),
  oneWeekPriceChange: z.number().nullish(),
  oneMonthPriceChange: z.number().nullish(),
  oneYearPriceChange: z.number().nullish(),
  lastTradePrice: z.number().nullish(),
  bestBid: z.number().nullish(),
  bestAsk: z.number().nullish(),
  automaticallyActive: z.boolean().nullish(),
  clearBookOnStart: z.boolean().nullish(),
  chartColor: z.string().nullish(),
  seriesColor: z.string().nullish(),
  showGmpSeries: z.boolean().nullish(),
  showGmpOutcome: z.boolean().nullish(),
  manualActivation: z.boolean().nullish(),
  negRiskOther: z.boolean().nullish(),
  gameId: z.string().nullish(),
  groupItemRange: z.string().nullish(),
  sportsMarketType: z.string().nullish(),
  line: z.number().nullish(),
  umaResolutionStatuses: z.string().nullish(),
  pendingDeployment: z.boolean().nullish(),
  deploying: z.boolean().nullish(),
  deployingTimestamp: IsoDateTimeStringSchema.nullish(),
  scheduledDeploymentTimestamp: IsoDateTimeStringSchema.nullish(),
  rfqEnabled: z.boolean().nullish(),
  eventStartTime: IsoDateTimeStringSchema.nullish(),
  internalUsers: z.array(InternalUserSchema).nullish(),
  holdingRewardsEnabled: z.boolean().nullish(),
  feesEnabled: z.boolean().nullish(),
  requiresTranslation: z.boolean().nullish(),
  makerRebatesFeeShareBps: z.number().int().nullish(),
  feeRate: z.number().nullish(),
  feeExponent: z.number().nullish(),
  feeType: z.string().nullish(),
  feeSchedule: FeeScheduleSchema.nullish(),
});

export const MarketSchema = GammaMarketSchema.transform(
  normalizeMarket,
) satisfies z.ZodType<Market>;

export const ListMarketsResponseSchema = z.array(MarketSchema);
export const ListMarketsKeysetResponseSchema = z
  .object({
    markets: z.array(MarketSchema),
    next_cursor: PaginationCursorSchema.optional(),
  })
  .transform(({ markets, next_cursor }) => ({
    items: markets,
    nextCursor: next_cursor,
  }));
export const FetchMarketTagsResponseSchema = z.array(TagReferenceSchema);

export type GammaMarket = z.infer<typeof GammaMarketSchema>;
export type ListMarketsResponse = z.infer<typeof ListMarketsResponseSchema>;
export type ListMarketsKeysetResponse = z.infer<
  typeof ListMarketsKeysetResponseSchema
>;
export type FetchMarketTagsResponse = z.infer<
  typeof FetchMarketTagsResponseSchema
>;

function normalizeMarket(market: GammaMarket): Market {
  return {
    id: market.id,
    slug: market.slug,
    conditionId: market.conditionId,
    question: market.question,
    description: market.description,
    category: market.category,
    image: market.image,
    icon: market.icon,
    state: {
      active: market.active,
      closed: market.closed,
      archived: market.archived,
      acceptingOrders: market.acceptingOrders,
      enableOrderBook: market.enableOrderBook,
      negRisk: market.negRisk,
      startDate: market.startDate,
      endDate: market.endDate,
      closedTime: market.closedTime,
    },
    outcomes: normalizeOutcomes(market),
    metrics: {
      volume: market.volume,
      volumeNum: market.volumeNum,
      volume24hr: market.volume24hr,
      volume1wk: market.volume1wk,
      volume1mo: market.volume1mo,
      volume1yr: market.volume1yr,
      volumeAmm: market.volumeAmm,
      volumeClob: market.volumeClob,
      liquidity: market.liquidity,
      liquidityNum: market.liquidityNum,
      liquidityClob: market.liquidityClob,
    },
    prices: {
      bestBid: market.bestBid,
      bestAsk: market.bestAsk,
      lastTradePrice: market.lastTradePrice,
      spread: market.spread,
      oneHourPriceChange: market.oneHourPriceChange,
      oneDayPriceChange: market.oneDayPriceChange,
      oneWeekPriceChange: market.oneWeekPriceChange,
      oneMonthPriceChange: market.oneMonthPriceChange,
      oneYearPriceChange: market.oneYearPriceChange,
    },
    trading: {
      minimumOrderSize: market.orderMinSize,
      minimumTickSize: market.orderPriceMinTickSize,
      secondsDelay: market.secondsDelay,
      feesEnabled: market.feesEnabled,
      feeType: market.feeType,
      feeSchedule: market.feeSchedule,
    },
    resolution: {
      questionId: parseOptionalString(QuestionIdSchema, market.questionID),
      negRiskRequestId: parseOptionalString(
        ResolutionRequestIdSchema,
        market.negRiskRequestID,
      ),
      umaResolutionStatus: market.umaResolutionStatus,
      source: market.resolutionSource,
      resolvedBy: parseOptionalString(EvmAddressSchema, market.resolvedBy),
    },
    rewards: {
      clobRewards: market.clobRewards,
      rewardsMinSize: market.rewardsMinSize,
      rewardsMaxSpread: market.rewardsMaxSpread,
      holdingRewardsEnabled: market.holdingRewardsEnabled,
    },
    sports: {
      sportsMarketType: market.sportsMarketType,
      line: market.line,
      gameId: market.gameId,
      gameStartTime: market.gameStartTime,
    },
    events: (market.events ?? []).map((event) => ({
      id: event.id,
      slug: readOptionalString(event.slug),
      title: readOptionalString(event.title),
    })),
    tags: (market.tags ?? []).map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      label: tag.label,
    })),
  };
}

function parseOptionalString<T>(
  schema: z.ZodType<T>,
  value: string | null | undefined,
): T | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return schema.parse(value);
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseJsonString(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function normalizeOutcomes(market: GammaMarket) {
  return {
    yes: {
      label: market.outcomes[0],
      tokenId: market.clobTokenIds?.[0] ?? null,
      price: market.outcomePrices?.[0] ?? null,
    },
    no: {
      label: market.outcomes[1],
      tokenId: market.clobTokenIds?.[1] ?? null,
      price: market.outcomePrices?.[1] ?? null,
    },
  };
}
