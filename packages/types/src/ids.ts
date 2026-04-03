import type { Tagged } from 'type-fest';

function toTaggedString<T extends string>(value: string): T {
  return value as T;
}

function toTaggedInteger<T extends number>(value: number): T {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Expected an integer, received: ${value}`);
  }

  return value as T;
}

export type BestLineId = Tagged<string, 'BestLineId'>;
export type CategoryId = Tagged<string, 'CategoryId'>;
export type ChatId = Tagged<string, 'ChatId'>;
export type ClobRewardId = Tagged<string, 'ClobRewardId'>;
export type CollectionId = Tagged<string, 'CollectionId'>;
export type EventCreatorId = Tagged<string, 'EventCreatorId'>;
export type EventExternalPartnerMappingId = Tagged<
  number,
  'EventExternalPartnerMappingId'
>;
export type EventId = Tagged<string, 'EventId'>;
export type ImageOptimizationId = Tagged<string, 'ImageOptimizationId'>;
export type InternalUserId = Tagged<string, 'InternalUserId'>;
export type MarketId = Tagged<string, 'MarketId'>;
export type PartnerId = Tagged<number, 'PartnerId'>;
export type SeriesId = Tagged<string, 'SeriesId'>;
export type SportId = Tagged<number, 'SportId'>;
export type TagId = Tagged<string, 'TagId'>;
export type TeamId = Tagged<number, 'TeamId'>;
export type TemplateId = Tagged<string, 'TemplateId'>;

export const toBestLineId = (value: string): BestLineId =>
  toTaggedString<BestLineId>(value);
export const toCategoryId = (value: string): CategoryId =>
  toTaggedString<CategoryId>(value);
export const toChatId = (value: string): ChatId =>
  toTaggedString<ChatId>(value);
export const toClobRewardId = (value: string): ClobRewardId =>
  toTaggedString<ClobRewardId>(value);
export const toCollectionId = (value: string): CollectionId =>
  toTaggedString<CollectionId>(value);
export const toEventCreatorId = (value: string): EventCreatorId =>
  toTaggedString<EventCreatorId>(value);
export const toEventExternalPartnerMappingId = (
  value: number,
): EventExternalPartnerMappingId =>
  toTaggedInteger<EventExternalPartnerMappingId>(value);
export const toEventId = (value: string): EventId =>
  toTaggedString<EventId>(value);
export const toImageOptimizationId = (value: string): ImageOptimizationId =>
  toTaggedString<ImageOptimizationId>(value);
export const toInternalUserId = (value: string): InternalUserId =>
  toTaggedString<InternalUserId>(value);
export const toMarketId = (value: string): MarketId =>
  toTaggedString<MarketId>(value);
export const toPartnerId = (value: number): PartnerId =>
  toTaggedInteger<PartnerId>(value);
export const toSeriesId = (value: string): SeriesId =>
  toTaggedString<SeriesId>(value);
export const toSportId = (value: number): SportId =>
  toTaggedInteger<SportId>(value);
export const toTagId = (value: string): TagId => toTaggedString<TagId>(value);
export const toTeamId = (value: number): TeamId =>
  toTaggedInteger<TeamId>(value);
export const toTemplateId = (value: string): TemplateId =>
  toTaggedString<TemplateId>(value);
