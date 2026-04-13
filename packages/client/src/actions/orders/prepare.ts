import { expectEvmSignature, never } from '@polymarket/types';
import type { SecureClient } from '../../clients';
import type {
  InsufficientLiquidityError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../../errors';
import { parseUserInput } from '../../input';
import { TypedDataPayload } from '../../types';
import { resolveCurrentAllowance } from './allowance';
import { PrepareLimitOrderParamsSchema, prepareLimitOrderDraft } from './limit';
import {
  PrepareMarketOrderParamsSchema,
  prepareMarketOrderDraft,
} from './market';
import { createSignedOrder, createUnsignedOrder } from './orders';
import { createOrderTypedDataPayload } from './typed-data';
import {
  type OrderWorkflow,
  type PrepareLimitOrderRequest,
  type PrepareMarketOrderRequest,
  signOrder,
} from './types';

export type PrepareMarketOrderError =
  | InsufficientLiquidityError
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Starts the market-order workflow.
 *
 * @throws {@link PrepareMarketOrderError}
 * Thrown when the request is invalid, required market or allowance data cannot
 * be fetched, or the current order book cannot satisfy the requested fill.
 */
export async function prepareMarketOrder(
  client: SecureClient,
  request: PrepareMarketOrderRequest,
): Promise<OrderWorkflow> {
  const params = parseUserInput(request, PrepareMarketOrderParamsSchema);

  return async function* (): OrderWorkflow {
    const draft = await prepareMarketOrderDraft(client, params);

    const currentAllowance = await resolveCurrentAllowance(client, {
      spenderAddress: draft.exchangeAddress,
      side: draft.side,
      tokenId: draft.tokenId,
    });

    if (currentAllowance < draft.offeredAmount) {
      return never('Not implemented yet');
    }

    const unsignedOrder = createUnsignedOrder(draft, client.account);

    const signature = expectEvmSignature(
      yield signOrder(createOrderTypedDataPayload(unsignedOrder)),
    );

    return createSignedOrder(unsignedOrder, signature);
  }.call(null);
}

export type PrepareLimitOrderError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Starts the limit-order workflow.
 *
 * @throws {@link PrepareLimitOrderError}
 * Thrown when the request is invalid, required market or allowance data cannot
 * be fetched, or signing prerequisites cannot be resolved.
 */
export async function prepareLimitOrder(
  client: SecureClient,
  request: PrepareLimitOrderRequest,
): Promise<OrderWorkflow> {
  const params = parseUserInput(request, PrepareLimitOrderParamsSchema);

  return async function* (): OrderWorkflow {
    const draft = await prepareLimitOrderDraft(client, params);

    const currentAllowance = await resolveCurrentAllowance(client, {
      spenderAddress: draft.exchangeAddress,
      side: draft.side,
      tokenId: draft.tokenId,
    });

    if (currentAllowance < draft.offeredAmount) {
      return never('Not implemented yet');
    }

    const unsignedOrder = createUnsignedOrder(draft, client.account);

    const signature = expectEvmSignature(
      yield signOrder(createOrderTypedDataPayload(unsignedOrder)),
    );

    return createSignedOrder(unsignedOrder, signature);
  }.call(null);
}
