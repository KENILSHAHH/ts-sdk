import { type EvmAddress, EvmAddressSchema } from '@polymarket/bindings';
import { WalletType } from '@polymarket/bindings/gamma';
import type { EvmSignature } from '@polymarket/types';
import { z } from 'zod';
import { erc20TransferCall } from '../abis';
import type { BaseSecureClient } from '../clients';
import { makeErrorGuard, UserInputError } from '../errors';
import { parseUserInput } from '../input';
import { expectTransactionHandle, type TransactionHandle } from '../types';
import type { SignerTransactionRequest } from '../workflow';
import {
  type SendErc20TransferTransactionRequest,
  signerTransactionRequest,
} from '../workflow';
import {
  GaslessTransactionMetadataSchema,
  type GaslessWorkflowRequest,
  prepareGaslessTransaction,
} from './gasless';

export type Erc20TransferWorkflowRequest =
  | GaslessWorkflowRequest
  | SendErc20TransferTransactionRequest;

export type Erc20TransferWorkflow = AsyncGenerator<
  Erc20TransferWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

const PrepareErc20TransferRequestSchema = z.object({
  amount: z.bigint(),
  metadata: GaslessTransactionMetadataSchema.optional(),
  recipientAddress: EvmAddressSchema,
  tokenAddress: EvmAddressSchema,
});

export type PrepareErc20TransferRequest = z.input<
  typeof PrepareErc20TransferRequestSchema
>;

export type PrepareErc20TransferError = UserInputError;
export const PrepareErc20TransferError = makeErrorGuard(UserInputError);

/**
 * Starts an ERC-20 transfer workflow.
 *
 * @example
 * ```ts
 * const handle = await prepareErc20Transfer(client, {
 *   amount: 1n,
 *   recipientAddress: client.account.signer,
 *   tokenAddress: client.environment.collateralToken,
 * }).then(completeWith(wallet));
 *
 * const outcome = await handle.wait();
 *
 * // outcome.transactionHash: TxHash
 * ```
 *
 * @throws {@link PrepareErc20TransferError}
 * Thrown on failure.
 */
export async function prepareErc20Transfer(
  client: BaseSecureClient,
  request: PrepareErc20TransferRequest,
): Promise<Erc20TransferWorkflow> {
  const params = parseUserInput(request, PrepareErc20TransferRequestSchema);

  return async function* (): Erc20TransferWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendErc20TransferTransaction(
          signerTransactionRequest(
            client.environment.chainId,
            erc20TransferCall(
              params.tokenAddress,
              params.recipientAddress,
              params.amount,
            ),
          ),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [
        erc20TransferCall(
          params.tokenAddress,
          params.recipientAddress,
          params.amount,
        ),
      ],
      metadata:
        params.metadata ??
        `Transfer ${params.amount} of ${params.tokenAddress} to ${params.recipientAddress}`,
    });
  }.call(null);
}

function sendErc20TransferTransaction(
  request: SignerTransactionRequest,
): SendErc20TransferTransactionRequest {
  return {
    kind: 'sendErc20TransferTransaction',
    request,
  };
}
