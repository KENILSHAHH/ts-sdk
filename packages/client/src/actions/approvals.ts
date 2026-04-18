import { type EvmAddress, EvmAddressSchema } from '@polymarket/bindings';
import { WalletType } from '@polymarket/bindings/gamma';
import type { EvmSignature } from '@polymarket/types';
import { z } from 'zod';
import {
  erc20ApprovalCall,
  erc1155ApprovalForAllCall,
  MAX_UINT256,
} from '../abis';
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
} from './gasless';

export type SendErc20ApprovalTransactionRequest = {
  kind: 'sendErc20ApprovalTransaction';
  request: SignerTransactionRequest;
};

export type Erc20ApprovalWorkflowRequest =
  | GaslessWorkflowRequest
  | SendErc20ApprovalTransactionRequest;

export type Erc20ApprovalWorkflow = AsyncGenerator<
  Erc20ApprovalWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
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
 * const handle = await prepareErc20Approval(client, {
 *   amount: 'max',
 *   spenderAddress: '0x1234…',
 *   tokenAddress: '0x5678…',
 * }).then(completeWith(wallet));
 *
 * const outcome = await handle.wait();
 *
 * // outcome.transactionHash: TxHash
 * ```
 *
 * @throws {@link PrepareErc20ApprovalError}
 * Thrown on failure.
 */
export async function prepareErc20Approval(
  client: SecureClient,
  request: PrepareErc20ApprovalRequest,
): Promise<Erc20ApprovalWorkflow> {
  const params = parseUserInput(request, PrepareErc20ApprovalRequestSchema);
  const amount = params.amount === 'max' ? MAX_UINT256 : params.amount;

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
      metadata:
        params.metadata ??
        `Approve ${params.amount} of ${params.tokenAddress} to ${params.spenderAddress}`,
    });
  }.call(null);
}

export type SendErc1155ApprovalForAllTransactionRequest = {
  kind: 'sendErc1155ApprovalForAllTransaction';
  request: SignerTransactionRequest;
};

export type Erc1155ApprovalForAllWorkflowRequest =
  | GaslessWorkflowRequest
  | SendErc1155ApprovalForAllTransactionRequest;

export type Erc1155ApprovalForAllWorkflow = AsyncGenerator<
  Erc1155ApprovalForAllWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

const PrepareErc1155ApprovalForAllRequestSchema = z.object({
  approved: z.boolean().default(true),
  metadata: GaslessTransactionMetadataSchema.optional(),
  operatorAddress: EvmAddressSchema,
  tokenAddress: EvmAddressSchema,
});

export type PrepareErc1155ApprovalForAllRequest = z.input<
  typeof PrepareErc1155ApprovalForAllRequestSchema
>;

export type PrepareErc1155ApprovalForAllError = UserInputError;

/**
 * Starts an ERC-1155 approval-for-all workflow.
 *
 * @example
 * ```ts
 * const handle = await prepareErc1155ApprovalForAll(client, {
 *   operatorAddress: '0x1234…',
 *   tokenAddress: '0x5678…',
 * }).then(completeWith(wallet));
 *
 * const outcome = await handle.wait();
 *
 * // outcome.transactionHash: TxHash
 * ```
 *
 * @throws {@link PrepareErc1155ApprovalForAllError}
 * Thrown on failure.
 */
export async function prepareErc1155ApprovalForAll(
  client: SecureClient,
  request: PrepareErc1155ApprovalForAllRequest,
): Promise<Erc1155ApprovalForAllWorkflow> {
  const params = parseUserInput(
    request,
    PrepareErc1155ApprovalForAllRequestSchema,
  );

  return async function* (): Erc1155ApprovalForAllWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendErc1155ApprovalForAllTransaction(
          erc1155ApprovalForAllCall(
            params.tokenAddress,
            params.operatorAddress,
            params.approved,
          ),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [
        erc1155ApprovalForAllCall(
          params.tokenAddress,
          params.operatorAddress,
          params.approved,
        ),
      ],
      metadata:
        params.metadata ??
        `${params.approved ? 'Approve' : 'Revoke'} ${params.operatorAddress} on ${params.tokenAddress}`,
    });
  }.call(null);
}

export type TradingApprovalsWorkflowRequest =
  | GaslessWorkflowRequest
  | SendErc20ApprovalTransactionRequest
  | SendErc1155ApprovalForAllTransactionRequest;

export type TradingApprovalsWorkflow = AsyncGenerator<
  TradingApprovalsWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

export type PrepareTradingApprovalsError = UserInputError;

/**
 * Starts a trading-setup approval workflow.
 *
 * Prepares all approvals required for trading, including collateral and
 * position token approvals for both standard and neg-risk market flows.
 * The neg-risk adapter approvals cover split, merge, and redemption workflows
 * on neg-risk markets.
 *
 * @example
 * ```ts
 * const handle = await prepareTradingApprovals(client).then(completeWith(wallet));
 *
 * const outcome = await handle.wait();
 *
 * // outcome.transactionHash: TxHash
 * ```
 *
 * @throws {@link PrepareTradingApprovalsError}
 * Thrown on failure.
 */
export async function prepareTradingApprovals(
  client: SecureClient,
): Promise<TradingApprovalsWorkflow> {
  const calls = [
    erc20ApprovalCall(
      client.environment.collateralToken,
      client.environment.standardExchange,
      MAX_UINT256,
    ),
    erc20ApprovalCall(
      client.environment.collateralToken,
      client.environment.negRiskExchange,
      MAX_UINT256,
    ),
    erc20ApprovalCall(
      client.environment.collateralToken,
      client.environment.negRiskAdapter,
      MAX_UINT256,
    ),
    erc1155ApprovalForAllCall(
      client.environment.conditionalTokens,
      client.environment.standardExchange,
      true,
    ),
    erc1155ApprovalForAllCall(
      client.environment.conditionalTokens,
      client.environment.negRiskExchange,
      true,
    ),
    erc1155ApprovalForAllCall(
      client.environment.conditionalTokens,
      client.environment.negRiskAdapter,
      true,
    ),
  ] as const;

  return async function* (): TradingApprovalsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      const collateralStandardApproval = expectTransactionHandle(
        yield sendErc20ApprovalTransaction(calls[0]),
      );
      await collateralStandardApproval.wait();

      const collateralNegRiskApproval = expectTransactionHandle(
        yield sendErc20ApprovalTransaction(calls[1]),
      );
      await collateralNegRiskApproval.wait();

      const collateralNegRiskAdapterApproval = expectTransactionHandle(
        yield sendErc20ApprovalTransaction(calls[2]),
      );
      await collateralNegRiskAdapterApproval.wait();

      const conditionalStandardApproval = expectTransactionHandle(
        yield sendErc1155ApprovalForAllTransaction(calls[3]),
      );
      await conditionalStandardApproval.wait();

      const conditionalNegRiskApproval = expectTransactionHandle(
        yield sendErc1155ApprovalForAllTransaction(calls[4]),
      );
      await conditionalNegRiskApproval.wait();

      return expectTransactionHandle(
        yield sendErc1155ApprovalForAllTransaction(calls[5]),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [...calls],
      metadata: 'Trading setup approvals',
    });
  }.call(null);
}

function sendErc20ApprovalTransaction(
  request: SignerTransactionRequest,
): SendErc20ApprovalTransactionRequest {
  return {
    kind: 'sendErc20ApprovalTransaction',
    request,
  };
}

function sendErc1155ApprovalForAllTransaction(
  request: SignerTransactionRequest,
): SendErc1155ApprovalForAllTransactionRequest {
  return {
    kind: 'sendErc1155ApprovalForAllTransaction',
    request,
  };
}
