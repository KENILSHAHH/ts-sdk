import { expectSignature, never } from '@polymarket/types';
import type { SecureClient } from '../../clients';
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

/**
 * Starts the market-order workflow.
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

/**
 * Starts the limit-order workflow.
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
