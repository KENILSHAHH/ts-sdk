import { OrderSide } from '@polymarket/bindings/clob';
import {
  type EvmAddress,
  type EvmSignature,
  expectEvmSignature,
} from '@polymarket/types';
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
import type { TransactionHandle } from '../../types';
import {
  type Erc20ApprovalWorkflowRequest,
  type Erc1155ApprovalForAllWorkflowRequest,
  prepareErc20Approval,
  prepareErc1155ApprovalForAll,
} from '../approvals';
import { resolveCurrentAllowance } from './allowance';
import { PrepareLimitOrderParamsSchema, prepareLimitOrderDraft } from './limit';
import {
  PrepareMarketOrderParamsSchema,
  prepareMarketOrderDraft,
} from './market';
import { createSignedOrder, createUnsignedOrder } from './orders';
import { createOrderTypedDataPayload } from './typed-data';
import {
  type OrderDraft,
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
 * Thrown on failure.
 */
export async function prepareMarketOrder(
  client: SecureClient,
  request: PrepareMarketOrderRequest,
): Promise<OrderWorkflow> {
  const params = parseUserInput(request, PrepareMarketOrderParamsSchema);

  return async function* (): OrderWorkflow {
    const draft = await prepareMarketOrderDraft(client, params);

    yield* ensureOrderApproval(client, draft);

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
 * Thrown on failure.
 */
export async function prepareLimitOrder(
  client: SecureClient,
  request: PrepareLimitOrderRequest,
): Promise<OrderWorkflow> {
  const params = parseUserInput(request, PrepareLimitOrderParamsSchema);

  return async function* (): OrderWorkflow {
    const draft = await prepareLimitOrderDraft(client, params);

    yield* ensureOrderApproval(client, draft);

    const unsignedOrder = createUnsignedOrder(draft, client.account);

    const signature = expectEvmSignature(
      yield signOrder(createOrderTypedDataPayload(unsignedOrder)),
    );

    return createSignedOrder(unsignedOrder, signature);
  }.call(null);
}

async function* ensureOrderApproval(
  client: SecureClient,
  draft: OrderDraft,
): AsyncGenerator<
  Erc20ApprovalWorkflowRequest | Erc1155ApprovalForAllWorkflowRequest,
  void,
  EvmAddress | EvmSignature | TransactionHandle
> {
  const currentAllowance = await resolveCurrentAllowance(client, {
    spenderAddress: draft.exchangeAddress,
    side: draft.side,
    tokenId: draft.tokenId,
  });

  if (currentAllowance >= draft.offeredAmount) {
    return;
  }

  const handle =
    draft.side === OrderSide.BUY
      ? yield* await prepareErc20Approval(client, {
          amount: 'max',
          spenderAddress: draft.exchangeAddress,
          tokenAddress: client.environment.collateralToken,
        })
      : yield* await prepareErc1155ApprovalForAll(client, {
          operatorAddress: draft.exchangeAddress,
          tokenAddress: client.environment.conditionalTokens,
        });

  await handle.wait();
}
