import { z } from 'zod';

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

export const OrderSideSchema = z.enum(OrderSide);
export const OrderTypeSchema = z.enum(OrderType);
