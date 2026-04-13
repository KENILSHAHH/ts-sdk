import {
  type EvmAddress,
  expectEvmAddress,
  expectTxHash,
  type TxHash,
} from '@polymarket/types';
import { z } from 'zod';

type Tagged<T, Tag extends string> = T & { readonly __tag: Tag };

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
export type Uuid = Tagged<string, 'Uuid'>;
export type ApiKey = Tagged<Uuid, 'ApiKey'>;
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
export type NotificationId = Tagged<number, 'NotificationId'>;
export type PartnerId = Tagged<number, 'PartnerId'>;
export type SeriesId = Tagged<string, 'SeriesId'>;
export type SportId = Tagged<number, 'SportId'>;
export type TagId = Tagged<string, 'TagId'>;
export type TeamId = Tagged<number, 'TeamId'>;
export type TemplateId = Tagged<string, 'TemplateId'>;
export type TransactionId = Tagged<string, 'TransactionId'>;
export type TokenId = Tagged<string, 'TokenId'>;

export function toBestLineId(value: string): BestLineId {
  return toTaggedString<BestLineId>(value);
}

export function toUuid(value: string): Uuid {
  return toTaggedString<Uuid>(value);
}

export function toApiKey(value: string): ApiKey {
  return toTaggedString<ApiKey>(value);
}

export function toCategoryId(value: string): CategoryId {
  return toTaggedString<CategoryId>(value);
}

export function toChatId(value: string): ChatId {
  return toTaggedString<ChatId>(value);
}

export function toClobRewardId(value: string): ClobRewardId {
  return toTaggedString<ClobRewardId>(value);
}

export function toCollectionId(value: string): CollectionId {
  return toTaggedString<CollectionId>(value);
}

export function toEventCreatorId(value: string): EventCreatorId {
  return toTaggedString<EventCreatorId>(value);
}

export function toEventExternalPartnerMappingId(
  value: number,
): EventExternalPartnerMappingId {
  return toTaggedInteger<EventExternalPartnerMappingId>(value);
}

export function toEventId(value: string): EventId {
  return toTaggedString<EventId>(value);
}

export function toImageOptimizationId(value: string): ImageOptimizationId {
  return toTaggedString<ImageOptimizationId>(value);
}

export function toInternalUserId(value: string): InternalUserId {
  return toTaggedString<InternalUserId>(value);
}

export function toMarketId(value: string): MarketId {
  return toTaggedString<MarketId>(value);
}

export function toNotificationId(value: number): NotificationId {
  return toTaggedInteger<NotificationId>(value);
}

export function toPartnerId(value: number): PartnerId {
  return toTaggedInteger<PartnerId>(value);
}

export function toSeriesId(value: string): SeriesId {
  return toTaggedString<SeriesId>(value);
}

export function toSportId(value: number): SportId {
  return toTaggedInteger<SportId>(value);
}

export function toTagId(value: string): TagId {
  return toTaggedString<TagId>(value);
}

export function toTeamId(value: number): TeamId {
  return toTaggedInteger<TeamId>(value);
}

export function toTemplateId(value: string): TemplateId {
  return toTaggedString<TemplateId>(value);
}

export function toTransactionId(value: string): TransactionId {
  return toTaggedString<TransactionId>(value);
}

export function toTokenId(value: string): TokenId {
  return toTaggedString<TokenId>(value);
}

export const CategoryIdSchema = z.string().transform(toCategoryId);
export const ApiKeySchema = z.string().transform(toApiKey);
export const ClobRewardIdSchema = z.string().transform(toClobRewardId);
export const EvmAddressSchema = z.string().transform(toEvmAddress);
export const EventIdSchema = z.string().transform(toEventId);
export const TickSizeValueSchema = z.union([
  z.literal(0.1),
  z.literal(0.01),
  z.literal(0.001),
  z.literal(0.0001),
]);
export const ISODateStringSchema = z
  .string()
  .or(z.date().transform(toISODateString));
export const ISOCalendarDateSchema = z
  .string()
  .or(z.date().transform(toISOCalendarDateString));
export const ImageOptimizationIdSchema = z
  .string()
  .transform(toImageOptimizationId);
export const InternalUserIdSchema = z.string().transform(toInternalUserId);
export const MarketIdSchema = z.string().transform(toMarketId);
export const NotificationIdSchema = z
  .number()
  .int()
  .transform(toNotificationId);
export const TagIdSchema = z.string().transform(toTagId);
export const TokenIdSchema = z.string().transform(toTokenId);
export const TransactionIdSchema = z.string().min(1).transform(toTransactionId);
export const TxHashSchema = z.string().transform(toTxHash);

export type ISODateString = z.output<typeof ISODateStringSchema>;
export type ISOCalendarDateString = z.output<typeof ISOCalendarDateSchema>;
export type TickSizeValue = z.output<typeof TickSizeValueSchema>;

export type { EvmAddress, TxHash };

function toISODateString(value: Date): string {
  return value.toISOString();
}

function toISOCalendarDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toEvmAddress(value: string): EvmAddress {
  return expectEvmAddress(value);
}

function toTxHash(value: string): TxHash {
  return expectTxHash(value);
}
