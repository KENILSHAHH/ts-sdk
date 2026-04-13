import { type EvmAddress, EvmAddressSchema } from '@polymarket/bindings';
import { WalletType } from '@polymarket/bindings/gamma';
import type { EvmSignature } from '@polymarket/types';
import { z } from 'zod';
import { erc20ApprovalCall, MAX_APPROVAL_AMOUNT } from '../abis';
import type { SecureClient } from '../clients';
import type { UserInputError } from '../errors';
import { parseUserInput } from '../input';
import {
  expectTransactionHandle,
  type SignerTransactionRequest,
  type TransactionHandle,
} from '../types';
import {
  GaslessTransactionMetadataSchema,
  type GaslessWorkflowRequest,
  prepareGaslessTransaction,
} from './relayer';

export type Erc20ApprovalWorkflowRequest =
  | GaslessWorkflowRequest
  | {
      kind: 'sendErc20ApprovalTransaction';
      request: SignerTransactionRequest;
    };

export type Erc20ApprovalWorkflow = AsyncGenerator<
  Erc20ApprovalWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature
>;

const PrepareErc20ApprovalRequestSchema = z.object({
  amount: z.union([z.bigint(), z.literal('max')]),
  metadata: GaslessTransactionMetadataSchema.optional(),
  spenderAddress: EvmAddressSchema,
  tokenAddress: EvmAddressSchema,
});

export type PrepareErc20ApprovalRequest = z.input<
  typeof PrepareErc20ApprovalRequestSchema
>;

export type PrepareErc20ApprovalError = UserInputError;

/**
 * Starts an ERC-20 approval workflow.
 *
 * @example
 * ```ts
 * const result = await prepareErc20Approval(client, {
 *   amount: 'max',
 *   spenderAddress: '0x1234…',
 *   tokenAddress: '0x5678…',
 * }).then(approveWith(walletClient));
 * ```
 *
 * @throws {@link PrepareErc20ApprovalError}
 * Thrown when the request is invalid.
 */
export async function prepareErc20Approval(
  client: SecureClient,
  request: PrepareErc20ApprovalRequest,
): Promise<Erc20ApprovalWorkflow> {
  const params = parseUserInput(request, PrepareErc20ApprovalRequestSchema);
  const amount = params.amount === 'max' ? MAX_APPROVAL_AMOUNT : params.amount;

  return async function* (): Erc20ApprovalWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendErc20ApprovalTransaction(
          erc20ApprovalCall(params.tokenAddress, params.spenderAddress, amount),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [
        erc20ApprovalCall(params.tokenAddress, params.spenderAddress, amount),
      ],
      metadata: params.metadata,
    });
  }.call(null);
}

function sendErc20ApprovalTransaction(
  request: SignerTransactionRequest,
): Erc20ApprovalWorkflowRequest {
  return {
    kind: 'sendErc20ApprovalTransaction',
    request,
  };
}
