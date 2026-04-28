import {
  type EvmAddress,
  expectEvmAddress,
  expectTxHash,
  type HexString,
  isHexString,
  type TxHash,
} from '@polymarket/types';
import { z } from 'zod';

type Tagged<T, Tag extends string> = T & { readonly __tag: Tag };

export enum CommentParentEntityType {
  Event = 'Event',
  Series = 'Series',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  GTC = 'GTC',
  FOK = 'FOK',
  GTD = 'GTD',
  FAK = 'FAK',
}

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
export type ApiKey = Tagged<string, 'ApiKey'>;
export type CategoryId = Tagged<string, 'CategoryId'>;
export type ChatId = Tagged<string, 'ChatId'>;
export type ClobRewardId = Tagged<string, 'ClobRewardId'>;
export type CommentId = Tagged<string, 'CommentId'>;
export type ConditionId = Tagged<HexString, 'ConditionId'>;
export type CollectionId = Tagged<string, 'CollectionId'>;
export type EventCreatorId = Tagged<string, 'EventCreatorId'>;
export type EventExternalPartnerMappingId = Tagged<
  number,
  'EventExternalPartnerMappingId'
>;
export type EpochMilliseconds = Tagged<number, 'EpochMilliseconds'>;
export type EventId = Tagged<string, 'EventId'>;
export type ImageOptimizationId = Tagged<string, 'ImageOptimizationId'>;
export type InternalUserId = Tagged<string, 'InternalUserId'>;
export type IsoCalendarDateString = Tagged<string, 'IsoCalendarDateString'>;
export type IsoDateTimeString = Tagged<string, 'IsoDateTimeString'>;
export type LegacyDateTimeString = Tagged<string, 'LegacyDateTimeString'>;
export type MarketId = Tagged<string, 'MarketId'>;
export type NotificationId = Tagged<number, 'NotificationId'>;
export type PartnerId = Tagged<number, 'PartnerId'>;
export type PaginationCursor = Tagged<string, 'PaginationCursor'>;
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

export function toCommentId(value: string): CommentId {
  return toTaggedString<CommentId>(value);
}

export function toConditionId(value: string): ConditionId {
  if (!isHexString(value) || value.length !== 66) {
    throw new TypeError(`Expected a 32-byte hex string, received: ${value}`);
  }

  return value as ConditionId;
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

export function toEpochMilliseconds(value: number): EpochMilliseconds {
  return toTaggedInteger<EpochMilliseconds>(value);
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

export function toIsoCalendarDateString(value: string): IsoCalendarDateString {
  return toTaggedString<IsoCalendarDateString>(value);
}

export function toIsoDateTimeString(value: string): IsoDateTimeString {
  return toTaggedString<IsoDateTimeString>(value);
}

export function toLegacyDateTimeString(value: string): LegacyDateTimeString {
  return toTaggedString<LegacyDateTimeString>(value);
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

export function toPaginationCursor(value: string): PaginationCursor {
  return toTaggedString<PaginationCursor>(value);
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
export const CommentIdSchema = z.string().transform(toCommentId);
export const ConditionIdSchema = z.string().transform(toConditionId);
export const OptionalConditionIdSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  ConditionIdSchema.optional(),
);
export const EvmAddressSchema = z.string().transform(toEvmAddress);
export const EpochMillisecondsSchema = z
  .number()
  .int()
  .transform(toEpochMilliseconds);
export const EventIdSchema = z
  .union([z.string(), z.number().int().transform(String)])
  .transform(toEventId);
export const TickSizeValueSchema = z.union([
  z.literal(0.1),
  z.literal(0.01),
  z.literal(0.001),
  z.literal(0.0001),
]);
export const IsoDateTimeStringSchema = z
  .string()
  .transform(toIsoDateTimeString)
  .or(z.date().transform((value) => toIsoDateTimeString(value.toISOString())));
export const IsoCalendarDateStringSchema = z
  .string()
  .transform(toIsoCalendarDateString)
  .or(
    z
      .date()
      .transform((value) =>
        toIsoCalendarDateString(value.toISOString().slice(0, 10)),
      ),
  );
export const LegacyDateTimeStringSchema = z
  .string()
  .transform(toLegacyDateTimeString);
export const ISODateStringSchema = IsoDateTimeStringSchema;
export const ISOCalendarDateSchema = IsoCalendarDateStringSchema;
export const ImageOptimizationIdSchema = z
  .string()
  .transform(toImageOptimizationId);
export const InternalUserIdSchema = z.string().transform(toInternalUserId);
export const MarketIdSchema = z.string().transform(toMarketId);
export const NotificationIdSchema = z
  .number()
  .int()
  .transform(toNotificationId);
export const CommentParentEntityTypeSchema = z.enum(CommentParentEntityType);
export const OrderSideSchema = z.enum(OrderSide);
export const OrderTypeSchema = z.enum(OrderType);
export const PaginationCursorSchema = z
  .string()
  .min(1)
  .transform(toPaginationCursor);
export const TagIdSchema = z.string().transform(toTagId);
export const TokenIdSchema = z.string().transform(toTokenId);
export const TransactionIdSchema = z.string().min(1).transform(toTransactionId);
export const TxHashSchema = z.string().transform(toTxHash);

export type ISODateString = IsoDateTimeString;
export type ISOCalendarDateString = IsoCalendarDateString;
export type TickSizeValue = z.output<typeof TickSizeValueSchema>;

export type { EvmAddress, TxHash };

function toEvmAddress(value: string): EvmAddress {
  return expectEvmAddress(value);
}

function toTxHash(value: string): TxHash {
  return expectTxHash(value);
}
