import { expectSignature, never } from '@polymarket/types';
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
import { resolveCurrentAllowance } from './allowance';
import { PrepareLimitOrderParamsSchema, prepareLimitOrderDraft } from './limit';
import {
  PrepareMarketOrderParamsSchema,
  prepareMarketOrderDraft,
} from './market';
import { createSignedOrder, createUnsignedOrder } from './orders';
import { createOrderTypedDataPayload } from './typed-data';
import type {
  OrderWorkflow,
  PrepareLimitOrderRequest,
  PrepareMarketOrderRequest,
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

  return (async function* (): OrderWorkflow {
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

    const signature = expectSignature(
      yield {
        kind: 'signOrder',
        payload: createOrderTypedDataPayload(unsignedOrder),
      },
    );

    return createSignedOrder(unsignedOrder, signature);
  })();
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

  return (async function* (): OrderWorkflow {
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

    const signature = expectSignature(
      yield {
        kind: 'signOrder',
        payload: createOrderTypedDataPayload(unsignedOrder),
      },
    );

    return createSignedOrder(unsignedOrder, signature);
  })();
}
