import { z } from 'zod';
import {
  EventIdSchema,
  toBestLineId,
  toChatId,
  toCollectionId,
  toEventCreatorId,
  toEventExternalPartnerMappingId,
  toPartnerId,
  toSeriesId,
  toSportId,
  toTeamId,
  toTemplateId,
} from '../shared';
import {
  CategoryReferenceSchema,
  ImageOptimizationSchema,
  InternalUserSchema,
  RelatedMarketSchema,
  TagReferenceSchema,
} from './common';

const BestLineIdSchema = z.string().transform(toBestLineId);
const ChatIdSchema = z.string().transform(toChatId);
const CollectionIdSchema = z.string().transform(toCollectionId);
const EventCreatorIdSchema = z.string().transform(toEventCreatorId);
const EventExternalPartnerMappingIdSchema = z
  .number()
  .int()
  .transform(toEventExternalPartnerMappingId);
const PartnerIdSchema = z.number().int().transform(toPartnerId);
const SeriesIdSchema = z.string().transform(toSeriesId);
const SportIdSchema = z.number().int().transform(toSportId);
const TeamIdSchema = z.number().int().transform(toTeamId);
const TemplateIdSchema = z.string().transform(toTemplateId);

export const CollectionReferenceSchema = z.looseObject({
  id: CollectionIdSchema,
  ticker: z.string().nullish(),
  slug: z.string().nullish(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  collectionType: z.string().nullish(),
  description: z.string().nullish(),
  tags: z.string().nullish(),
  image: z.string().nullish(),
  icon: z.string().nullish(),
  headerImage: z.string().nullish(),
  layout: z.string().nullish(),
  active: z.boolean().nullish(),
  closed: z.boolean().nullish(),
  archived: z.boolean().nullish(),
  new: z.boolean().nullish(),
  featured: z.boolean().nullish(),
  restricted: z.boolean().nullish(),
  isTemplate: z.boolean().nullish(),
  templateVariables: z.string().nullish(),
  publishedAt: z.string().nullish(),
  createdBy: z.string().nullish(),
  updatedBy: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  disqusThread: z.string().nullish(),
  commentsEnabled: z.boolean().nullish(),
});

export const SeriesReferenceSchema = z.looseObject({
  id: SeriesIdSchema,
  ticker: z.string().nullish(),
  slug: z.string().nullish(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  seriesType: z.string().nullish(),
  recurrence: z.string().nullish(),
  description: z.string().nullish(),
  image: z.string().nullish(),
  icon: z.string().nullish(),
  layout: z.string().nullish(),
  active: z.boolean().nullish(),
  closed: z.boolean().nullish(),
  archived: z.boolean().nullish(),
  new: z.boolean().nullish(),
  featured: z.boolean().nullish(),
  restricted: z.boolean().nullish(),
  isTemplate: z.boolean().nullish(),
  templateVariables: z.boolean().nullish(),
  publishedAt: z.string().nullish(),
  createdBy: z.string().nullish(),
  updatedBy: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  commentsEnabled: z.boolean().nullish(),
  competitive: z.string().nullish(),
  volume24hr: z.number().nullish(),
  volume: z.number().nullish(),
  liquidity: z.number().nullish(),
  startDate: z.string().nullish(),
  pythTokenID: z.string().nullish(),
  cgAssetName: z.string().nullish(),
  score: z.number().int().nullish(),
  commentCount: z.number().int().nullish(),
  requiresTranslation: z.boolean().nullish(),
});

export const TemplateReferenceSchema = z.looseObject({
  id: TemplateIdSchema,
  displayName: z.string().nullish(),
  eventTitle: z.string().nullish(),
  eventSlug: z.string().nullish(),
  description: z.string().nullish(),
  resolutionSource: z.string().nullish(),
  marketsOrder: z.string().nullish(),
  marketsNegRisk: z.boolean().nullish(),
  marketsAugmentedNegRisk: z.boolean().nullish(),
  marketsShowImages: z.boolean().nullish(),
  markets: z.string().nullish(),
  userVariables: z.string().nullish(),
  creatorUserId: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const ChatSchema = z.looseObject({
  id: ChatIdSchema,
  channelId: z.string().nullish(),
  channelName: z.string().nullish(),
  channelImage: z.string().nullish(),
  live: z.boolean().nullish(),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
});

export const EventCreatorSchema = z.looseObject({
  id: EventCreatorIdSchema,
  creatorName: z.string().nullish(),
  creatorHandle: z.string().nullish(),
  creatorURL: z.string().nullish(),
  creatorImage: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const PartnerSchema = z.looseObject({
  id: PartnerIdSchema,
  slug: z.string(),
  name: z.string(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const EventExternalPartnerMappingSchema = z.looseObject({
  id: EventExternalPartnerMappingIdSchema,
  eventId: z.number().int(),
  partnerId: z.number().int(),
  externalId: z.string(),
  partner: PartnerSchema.nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const BestLineSchema = z.looseObject({
  id: BestLineIdSchema,
  lineType: z.string().nullish(),
  line: z.number().nullish(),
});

export const TeamSchema = z.looseObject({
  id: TeamIdSchema,
  name: z.string().nullish(),
  league: z.string().nullish(),
  record: z.string().nullish(),
  logo: z.string().nullish(),
  abbreviation: z.string().nullish(),
  alias: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  providerId: z.number().int().nullish(),
  color: z.string().nullish(),
});

export const SportsMetadataSchema = z.looseObject({
  id: SportIdSchema,
  sport: z.string(),
  image: z.string(),
  resolution: z.string(),
  ordering: z.string(),
  tags: z.string(),
  series: z.string(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const ListTeamsResponseSchema = z.array(TeamSchema);
export const ListSportsMetadataResponseSchema = z.array(SportsMetadataSchema);
export const SportsMarketTypesResponseSchema = z.looseObject({
  marketTypes: z.array(z.string()).nullish(),
});

export const EventSchema = z.looseObject({
  id: EventIdSchema,
  ticker: z.string().nullish(),
  slug: z.string().nullish(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  resolutionSource: z.string().nullish(),
  startDate: z.string().nullish(),
  creationDate: z.string().nullish(),
  endDate: z.string().nullish(),
  image: z.string().nullish(),
  icon: z.string().nullish(),
  active: z.boolean().nullish(),
  closed: z.boolean().nullish(),
  archived: z.boolean().nullish(),
  new: z.boolean().nullish(),
  featured: z.boolean().nullish(),
  restricted: z.boolean().nullish(),
  liquidity: z.number().nullish(),
  volume: z.number().nullish(),
  openInterest: z.number().nullish(),
  sortBy: z.string().nullish(),
  category: z.string().nullish(),
  subcategory: z.string().nullish(),
  isTemplate: z.boolean().nullish(),
  templateVariables: z.string().nullish(),
  published_at: z.string().nullish(),
  createdBy: z.string().nullish(),
  updatedBy: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  commentsEnabled: z.boolean().nullish(),
  competitive: z.number().nullish(),
  volume24hr: z.number().nullish(),
  volume1wk: z.number().nullish(),
  volume1mo: z.number().nullish(),
  volume1yr: z.number().nullish(),
  featuredImage: z.string().nullish(),
  disqusThread: z.string().nullish(),
  parentEventId: z.number().int().nullish(),
  enableOrderBook: z.boolean().nullish(),
  liquidityAmm: z.number().nullish(),
  liquidityClob: z.number().nullish(),
  negRisk: z.boolean().nullish(),
  negRiskMarketID: z.string().nullish(),
  negRiskFeeBips: z.number().int().nullish(),
  commentCount: z.number().int().nullish(),
  imageOptimized: ImageOptimizationSchema.nullish(),
  iconOptimized: ImageOptimizationSchema.nullish(),
  featuredImageOptimized: ImageOptimizationSchema.nullish(),
  subEvents: z.array(z.string()).nullish(),
  markets: z.array(RelatedMarketSchema).nullish(),
  series: z.array(SeriesReferenceSchema).nullish(),
  categories: z.array(CategoryReferenceSchema).nullish(),
  collections: z.array(CollectionReferenceSchema).nullish(),
  tags: z.array(TagReferenceSchema).nullish(),
  tag_labels: z.array(z.string()).nullish(),
  tag_slugs: z.array(z.string()).nullish(),
  cyom: z.boolean().nullish(),
  closedTime: z.string().nullish(),
  showAllOutcomes: z.boolean().nullish(),
  showMarketImages: z.boolean().nullish(),
  automaticallyResolved: z.boolean().nullish(),
  enableNegRisk: z.boolean().nullish(),
  automaticallyActive: z.boolean().nullish(),
  eventDate: z.string().nullish(),
  startTime: z.string().nullish(),
  eventWeek: z.number().int().nullish(),
  seriesSlug: z.string().nullish(),
  score: z.string().nullish(),
  elapsed: z.string().nullish(),
  period: z.string().nullish(),
  live: z.boolean().nullish(),
  ended: z.boolean().nullish(),
  finishedTimestamp: z.string().nullish(),
  gmpChartMode: z.string().nullish(),
  eventCreators: z.array(EventCreatorSchema).nullish(),
  negRiskAugmented: z.boolean().nullish(),
  countryName: z.string().nullish(),
  electionType: z.string().nullish(),
  color: z.string().nullish(),
  tweetCount: z.number().int().nullish(),
  chats: z.array(ChatSchema).nullish(),
  featuredOrder: z.number().int().nullish(),
  estimateValue: z.boolean().nullish(),
  cantEstimate: z.boolean().nullish(),
  estimatedValue: z.string().nullish(),
  cumulativeMarkets: z.boolean().nullish(),
  templates: z.array(TemplateReferenceSchema).nullish(),
  spreadsMainLine: z.number().nullish(),
  totalsMainLine: z.number().nullish(),
  carouselMap: z.string().nullish(),
  pendingDeployment: z.boolean().nullish(),
  deploying: z.boolean().nullish(),
  deployingTimestamp: z.string().nullish(),
  scheduledDeploymentTimestamp: z.string().nullish(),
  gameStatus: z.string().nullish(),
  internalUsers: z.array(InternalUserSchema).nullish(),
  gameId: z.number().int().nullish(),
  rescheduledFromGameId: z.number().int().nullish(),
  sportsradarMatchId: z.string().nullish(),
  bestLines: z.array(BestLineSchema).nullish(),
  homeTeamName: z.string().nullish(),
  awayTeamName: z.string().nullish(),
  requiresTranslation: z.boolean().nullish(),
  turnProviderId: z.string().nullish(),
  lastHighlight: z.string().nullish(),
  lastHighlightType: z.string().nullish(),
  lastHighlightAt: z.string().nullish(),
  eventMetadata: z.record(z.string(), z.unknown()).nullish(),
  teams: z.array(TeamSchema).nullish(),
  sport: SportsMetadataSchema.nullish(),
  externalPartners: z.array(EventExternalPartnerMappingSchema).nullish(),
});

export const ListEventsResponseSchema = z.array(EventSchema);
export const FetchEventTagsResponseSchema = z.array(TagReferenceSchema);

export type Event = z.infer<typeof EventSchema>;
export type ListEventsResponse = z.infer<typeof ListEventsResponseSchema>;
export type FetchEventTagsResponse = z.infer<
  typeof FetchEventTagsResponseSchema
>;
export type ListTeamsResponse = z.infer<typeof ListTeamsResponseSchema>;
export type ListSportsMetadataResponse = z.infer<
  typeof ListSportsMetadataResponseSchema
>;
export type SportsMarketTypesResponse = z.infer<
  typeof SportsMarketTypesResponseSchema
>;
export type CollectionReference = z.infer<typeof CollectionReferenceSchema>;
export type SeriesReference = z.infer<typeof SeriesReferenceSchema>;
export type TemplateReference = z.infer<typeof TemplateReferenceSchema>;
export type Chat = z.infer<typeof ChatSchema>;
export type EventCreator = z.infer<typeof EventCreatorSchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type EventExternalPartnerMapping = z.infer<
  typeof EventExternalPartnerMappingSchema
>;
export type BestLine = z.infer<typeof BestLineSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type SportsMetadata = z.infer<typeof SportsMetadataSchema>;
