import {
  type ApiKey,
  type CategoryId,
  type ClobRewardId,
  type EventId,
  type EvmAddress,
  expectEvmAddress,
  type ImageOptimizationId,
  type InternalUserId,
  type MarketId,
  type TagId,
  toApiKey,
  toCategoryId,
  toClobRewardId,
  toEventId,
  toImageOptimizationId,
  toInternalUserId,
  toMarketId,
  toTagId,
} from '@polymarket/types';
import { z } from 'zod';

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
export const TagIdSchema = z.string().transform(toTagId);

export type ISODateString = z.output<typeof ISODateStringSchema>;
export type ISOCalendarDateString = z.output<typeof ISOCalendarDateSchema>;
export type TickSizeValue = z.output<typeof TickSizeValueSchema>;

export type {
  ApiKey,
  CategoryId,
  ClobRewardId,
  EventId,
  EvmAddress,
  ImageOptimizationId,
  InternalUserId,
  MarketId,
  TagId,
};

function toISODateString(value: Date): string {
  return value.toISOString();
}

function toISOCalendarDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toEvmAddress(value: string): EvmAddress {
  return expectEvmAddress(value);
}
