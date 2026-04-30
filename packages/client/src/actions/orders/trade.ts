import type { OrderResponse } from '@polymarket/bindings/clob';
import type { BaseSecureClient } from '../../clients';
import {
  CancelledSigningError,
  InsufficientLiquidityError,
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../../errors';
import { completeWith } from '../../workflow';
import { type PostOrderError, postOrder } from './post';
import {
  type PrepareLimitOrderError,
  type PrepareMarketOrderError,
  prepareLimitOrder,
  prepareMarketOrder,
} from './prepare';
import type {
  PrepareLimitOrderRequest,
  PrepareMarketOrderRequest,
  SignedOrder,
} from './types';

export type CreateMarketOrderError =
  | PrepareMarketOrderError
  | CancelledSigningError;
export const CreateMarketOrderError = makeErrorGuard(
  CancelledSigningError,
  InsufficientLiquidityError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Creates a signed market order for the authenticated account.
 *
 * @throws {@link CreateMarketOrderError}
 * Thrown on failure.
 */
export function createMarketOrder(
  client: BaseSecureClient,
  request: PrepareMarketOrderRequest,
): Promise<SignedOrder> {
  return prepareMarketOrder(client, request).then(completeWith(client.signer));
}

export type PlaceMarketOrderError = CreateMarketOrderError | PostOrderError;
export const PlaceMarketOrderError = makeErrorGuard(
  CancelledSigningError,
  InsufficientLiquidityError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Creates and posts a market order for the authenticated account.
 *
 * @throws {@link PlaceMarketOrderError}
 * Thrown on failure.
 */
export function placeMarketOrder(
  client: BaseSecureClient,
  request: PrepareMarketOrderRequest,
): Promise<OrderResponse> {
  return createMarketOrder(client, request).then(postOrder(client));
}

export type CreateLimitOrderError =
  | PrepareLimitOrderError
  | CancelledSigningError;
export const CreateLimitOrderError = makeErrorGuard(
  CancelledSigningError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Creates a signed limit order for the authenticated account.
 *
 * @throws {@link CreateLimitOrderError}
 * Thrown on failure.
 */
export function createLimitOrder(
  client: BaseSecureClient,
  request: PrepareLimitOrderRequest,
): Promise<SignedOrder> {
  return prepareLimitOrder(client, request).then(completeWith(client.signer));
}

export type PlaceLimitOrderError = CreateLimitOrderError | PostOrderError;
export const PlaceLimitOrderError = makeErrorGuard(
  CancelledSigningError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Creates and posts a limit order for the authenticated account.
 *
 * @throws {@link PlaceLimitOrderError}
 * Thrown on failure.
 */
export function placeLimitOrder(
  client: BaseSecureClient,
  request: PrepareLimitOrderRequest,
): Promise<OrderResponse> {
  return createLimitOrder(client, request).then(postOrder(client));
}
