import { AssetType, OrderSide } from '@polymarket/bindings/clob';
import {
  type EvmAddress,
  type EvmSignature,
  expectEvmSignature,
} from '@polymarket/types';
import type { BaseSecureClient } from '../../clients';
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
import { updateBalanceAllowance } from '../account';
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
import { postOrder } from './post';
import { createOrderTypedDataPayload } from './typed-data';
import {
  type OrderDraft,
  type OrderPostingWorkflow,
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
 *
 * @example
 * ```ts
 * const response = await prepareMarketOrder(client, {
 *   amount: 10,
 *   side: OrderSide.BUY,
 *   tokenId: '123',
 * })
 *   .then(completeWith(wallet))
 *   .then(postOrder(client));
 *
 * // response: OrderResponse
 * ```
 */
export async function prepareMarketOrder(
  client: BaseSecureClient,
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
 *
 * @example
 * ```ts
 * const order = await prepareLimitOrder(client, {
 *   price: 0.52,
 *   side: OrderSide.BUY,
 *   size: 10,
 *   tokenId: '123',
 * }).then(completeWith(wallet))
 *   .then(postOrder(client));
 *
 * // response: OrderResponse
 * ```
 */
export async function prepareLimitOrder(
  client: BaseSecureClient,
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

export type PrepareMarketOrderPostingError = PrepareMarketOrderError;

/**
 * Starts and posts a market-order workflow.
 *
 * @throws {@link PrepareMarketOrderPostingError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const response = await prepareMarketOrderPosting(client, {
 *   amount: 10,
 *   side: OrderSide.BUY,
 *   tokenId: '123',
 * }).then(completeWith(wallet));
 *
 * // response: OrderResponse
 * ```
 */
export async function prepareMarketOrderPosting(
  client: BaseSecureClient,
  request: PrepareMarketOrderRequest,
): Promise<OrderPostingWorkflow> {
  return createOrderPostingWorkflow(
    client,
    prepareMarketOrder(client, request),
  );
}

export type PrepareLimitOrderPostingError = PrepareLimitOrderError;

/**
 * Starts and posts a limit-order workflow.
 *
 * @throws {@link PrepareLimitOrderPostingError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const response = await prepareLimitOrderPosting(client, {
 *   price: 0.52,
 *   side: OrderSide.BUY,
 *   size: 10,
 *   tokenId: '123',
 * }).then(completeWith(wallet));
 *
 * // response: OrderResponse
 * ```
 */
export async function prepareLimitOrderPosting(
  client: BaseSecureClient,
  request: PrepareLimitOrderRequest,
): Promise<OrderPostingWorkflow> {
  return createOrderPostingWorkflow(client, prepareLimitOrder(client, request));
}

async function createOrderPostingWorkflow(
  client: BaseSecureClient,
  workflowPromise: Promise<OrderWorkflow>,
): Promise<OrderPostingWorkflow> {
  const workflow = await workflowPromise;

  return async function* (): OrderPostingWorkflow {
    const order = yield* workflow;

    return postOrder(client)(order);
  }.call(null);
}

async function* ensureOrderApproval(
  client: BaseSecureClient,
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

  await updateBalanceAllowance(client, {
    assetType:
      draft.side === OrderSide.BUY
        ? AssetType.COLLATERAL
        : AssetType.CONDITIONAL,
    tokenId: draft.side === OrderSide.SELL ? draft.tokenId : undefined,
  });
}
