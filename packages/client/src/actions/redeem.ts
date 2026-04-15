import { ConditionIdSchema } from '@polymarket/bindings';
import { WalletType } from '@polymarket/bindings/gamma';
import type { EvmAddress, EvmSignature } from '@polymarket/types';
import { z } from 'zod';
import { ctfRedeemPositionsCall, negRiskRedeemPositionsCall } from '../abis';
import type { SecureClient } from '../clients';
import { UserInputError } from '../errors';
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

export type SendRedeemPositionsTransactionRequest = {
  kind: 'sendRedeemPositionsTransaction';
  request: SignerTransactionRequest;
};

export type RedeemPositionsWorkflowRequest =
  | GaslessWorkflowRequest
  | SendRedeemPositionsTransactionRequest;

export type RedeemPositionsWorkflow = AsyncGenerator<
  RedeemPositionsWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

const StandardRedeemRequestSchema = z.object({
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
  negRisk: z.literal(false).default(false),
  outcomeCount: z.number().int().min(2).max(256),
});

const NegRiskRedeemRequestSchema = z.object({
  amounts: z.tuple([z.bigint().min(0n), z.bigint().min(0n)]),
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
  negRisk: z.literal(true),
});

const PrepareRedeemPositionsRequestSchema = z.union([
  StandardRedeemRequestSchema,
  NegRiskRedeemRequestSchema,
]);

export type PrepareRedeemPositionsRequest = z.input<
  typeof PrepareRedeemPositionsRequestSchema
>;

export type PrepareRedeemPositionsError = UserInputError;

/**
 * Starts a redemption workflow for resolved positions.
 *
 * @example
 * ```ts
 * const result = await prepareRedeemPositions(client, {
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 *   outcomeCount: 2,
 * }).then(completeWith(walletClient));
 * ```
 *
 * @throws {@link PrepareRedeemPositionsError}
 * Thrown when the request is invalid or the environment does not support the requested redemption flow.
 */
export async function prepareRedeemPositions(
  client: SecureClient,
  request: PrepareRedeemPositionsRequest,
): Promise<RedeemPositionsWorkflow> {
  const params = parseUserInput(request, PrepareRedeemPositionsRequestSchema);
  const call = params.negRisk
    ? createNegRiskRedeemCall(client, params)
    : ctfRedeemPositionsCall(
        client.environment.conditionalTokens,
        client.environment.collateralToken,
        params.conditionId,
        params.outcomeCount,
      );

  return async function* (): RedeemPositionsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendRedeemPositionsTransaction(call),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata: params.metadata,
    });
  }.call(null);
}

function createNegRiskRedeemCall(
  client: SecureClient,
  request: z.output<typeof NegRiskRedeemRequestSchema>,
) {
  if (client.environment.negRiskAdapter === undefined) {
    throw new UserInputError(
      'Negative-risk redemption is not configured for this environment',
    );
  }

  return negRiskRedeemPositionsCall(
    client.environment.negRiskAdapter,
    request.conditionId,
    request.amounts,
  );
}

function sendRedeemPositionsTransaction(
  request: SignerTransactionRequest,
): SendRedeemPositionsTransactionRequest {
  return {
    kind: 'sendRedeemPositionsTransaction',
    request,
  };
}
