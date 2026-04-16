import type { ConditionId } from '@polymarket/bindings';
import { ConditionIdSchema } from '@polymarket/bindings';
import type { Position } from '@polymarket/bindings/data';
import { WalletType } from '@polymarket/bindings/gamma';
import {
  type EvmAddress,
  type EvmSignature,
  invariant,
  isNullish,
  isPresent,
} from '@polymarket/types';
import { z } from 'zod';
import {
  ctfRedeemPositionsCall,
  mergePositionsCall,
  negRiskRedeemPositionsCall,
  splitPositionCall,
} from '../abis';
import type { SecureClient } from '../clients';
import {
  type RateLimitError,
  type RequestRejectedError,
  type TransportError,
  type UnexpectedResponseError,
  UserInputError,
} from '../errors';
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
import { listMarkets } from './markets';
import { listPositions } from './portfolio';

type BinaryPositions = readonly [
  yes: Position | undefined,
  no: Position | undefined,
];

type PositiveAmount = bigint;

const PrepareSplitPositionRequestSchema = z.object({
  amount: z.bigint().min(0n),
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
});

const PrepareMergePositionsRequestSchema = z.object({
  amount: z.union([z.bigint().positive(), z.literal('max')]),
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
});

const PrepareRedeemPositionsRequestSchema = z.object({
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
});

export type SendSplitPositionTransactionRequest = {
  kind: 'sendSplitPositionTransaction';
  request: SignerTransactionRequest;
};

export type SendMergePositionsTransactionRequest = {
  kind: 'sendMergePositionsTransaction';
  request: SignerTransactionRequest;
};

export type SendRedeemPositionsTransactionRequest = {
  kind: 'sendRedeemPositionsTransaction';
  request: SignerTransactionRequest;
};

export type SplitPositionWorkflowRequest =
  | GaslessWorkflowRequest
  | SendSplitPositionTransactionRequest;

export type MergePositionsWorkflowRequest =
  | GaslessWorkflowRequest
  | SendMergePositionsTransactionRequest;

export type RedeemPositionsWorkflowRequest =
  | GaslessWorkflowRequest
  | SendRedeemPositionsTransactionRequest;

export type SplitPositionWorkflow = AsyncGenerator<
  SplitPositionWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

export type MergePositionsWorkflow = AsyncGenerator<
  MergePositionsWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

export type RedeemPositionsWorkflow = AsyncGenerator<
  RedeemPositionsWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature | TransactionHandle
>;

export type PrepareSplitPositionRequest = z.input<
  typeof PrepareSplitPositionRequestSchema
>;

export type PrepareMergePositionsRequest = z.input<
  typeof PrepareMergePositionsRequestSchema
>;

export type PrepareRedeemPositionsRequest = z.input<
  typeof PrepareRedeemPositionsRequestSchema
>;

export type PrepareSplitPositionError = UserInputError;
export type PrepareMergePositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export type PrepareRedeemPositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Starts a split workflow for a market condition.
 *
 * @example
 * ```ts
 * const result = await prepareSplitPosition(client, {
 *   amount: 1n,
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * }).then(completeWith(walletClient));
 * ```
 *
 * @throws {@link PrepareSplitPositionError}
 * Thrown on failure.
 */
export async function prepareSplitPosition(
  client: SecureClient,
  request: PrepareSplitPositionRequest,
): Promise<SplitPositionWorkflow> {
  const params = parseUserInput(request, PrepareSplitPositionRequestSchema);
  const negativeRisk = await resolveMarketNegativeRiskFlag(
    client,
    params.conditionId,
  );
  const call = splitPositionCall(
    resolveSplitTargetAddress(client, negativeRisk),
    client.environment.collateralToken,
    params.conditionId,
    params.amount,
    negativeRisk,
  );

  return async function* (): SplitPositionWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(yield sendSplitPositionTransaction(call));
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata:
        params.metadata ??
        `Split ${params.amount} positions for condition ${params.conditionId}`,
    });
  }.call(null);
}

/**
 * Starts a workflow to merge complementary positions in a market back into collateral.
 *
 * @example
 * ```ts
 * const result = await prepareMergePositions(client, {
 *   amount: 'max',
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * }).then(completeWith(walletClient));
 * ```
 *
 * @throws {@link PrepareMergePositionsError}
 * Thrown on failure.
 */
export async function prepareMergePositions(
  client: SecureClient,
  request: PrepareMergePositionsRequest,
): Promise<MergePositionsWorkflow> {
  const params = parseUserInput(request, PrepareMergePositionsRequestSchema);
  const positions = await listPositions(client, {
    user: client.account.wallet,
    market: [params.conditionId],
    sizeThreshold: 0,
  })
    .first()
    .then((page) => page.items);
  const binaryPositions = expectBinaryPositions(params.conditionId, positions);
  const negativeRisk = expectNegativeRiskFlag(
    params.conditionId,
    binaryPositions,
  );
  const amount = resolveMergeAmount(
    params.conditionId,
    binaryPositions,
    params.amount,
  );
  const call = mergePositionsCall(
    resolveMergeTargetAddress(client, negativeRisk),
    client.environment.collateralToken,
    params.conditionId,
    amount,
    negativeRisk,
  );

  return async function* (): MergePositionsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(yield sendMergePositionsTransaction(call));
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata:
        params.metadata ??
        `Merge ${amount} positions for condition ${params.conditionId}`,
    });
  }.call(null);
}

/**
 * Starts a redemption workflow for resolved positions.
 *
 * @example
 * ```ts
 * const result = await prepareRedeemPositions(client, {
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * }).then(completeWith(walletClient));
 * ```
 *
 * @throws {@link PrepareRedeemPositionsError}
 * Thrown on failure.
 */
export async function prepareRedeemPositions(
  client: SecureClient,
  request: PrepareRedeemPositionsRequest,
): Promise<RedeemPositionsWorkflow> {
  const params = parseUserInput(request, PrepareRedeemPositionsRequestSchema);
  const positions = await listPositions(client, {
    user: client.account.wallet,
    market: [params.conditionId],
    sizeThreshold: 0,
  })
    .first()
    .then((page) => page.items);
  const binaryPositions = expectBinaryPositions(params.conditionId, positions);
  const negativeRisk = expectNegativeRiskFlag(
    params.conditionId,
    binaryPositions,
  );
  const call = negativeRisk
    ? negRiskRedeemPositionsCall(
        client.environment.negRiskAdapter,
        params.conditionId,
        deriveNegRiskRedeemAmounts(binaryPositions),
      )
    : ctfRedeemPositionsCall(
        client.environment.conditionalTokens,
        client.environment.collateralToken,
        params.conditionId,
      );

  return async function* (): RedeemPositionsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendRedeemPositionsTransaction(call),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata:
        params.metadata ??
        `Redeem positions for condition ${params.conditionId}`,
    });
  }.call(null);
}

function sendSplitPositionTransaction(
  request: SignerTransactionRequest,
): SendSplitPositionTransactionRequest {
  return {
    kind: 'sendSplitPositionTransaction',
    request,
  };
}

function sendMergePositionsTransaction(
  request: SignerTransactionRequest,
): SendMergePositionsTransactionRequest {
  return {
    kind: 'sendMergePositionsTransaction',
    request,
  };
}

function sendRedeemPositionsTransaction(
  request: SignerTransactionRequest,
): SendRedeemPositionsTransactionRequest {
  return {
    kind: 'sendRedeemPositionsTransaction',
    request,
  };
}

function resolveSplitTargetAddress(client: SecureClient, negRisk: boolean) {
  return negRisk
    ? client.environment.negRiskAdapter
    : client.environment.conditionalTokens;
}

async function resolveMarketNegativeRiskFlag(
  client: SecureClient,
  conditionId: ConditionId,
): Promise<boolean> {
  const page = await listMarkets(client, {
    conditionIds: [conditionId],
    pageSize: 2,
  }).first();
  const markets = page.items;

  invariant(
    markets.length === 1,
    `Expected exactly one market for condition ${conditionId}`,
  );

  const market = markets[0];

  invariant(
    market !== undefined,
    `No market found for condition ${conditionId}`,
  );
  invariant(
    isPresent(market.negRisk),
    `Missing negRisk flag for condition ${conditionId}`,
  );

  return market.negRisk;
}

function resolveMergeTargetAddress(client: SecureClient, negRisk: boolean) {
  return negRisk
    ? client.environment.negRiskAdapter
    : client.environment.conditionalTokens;
}

function deriveNegRiskRedeemAmounts([
  yesPosition,
  noPosition,
]: BinaryPositions): readonly [bigint, bigint] {
  return [toPositionAmount(yesPosition, 0), toPositionAmount(noPosition, 1)];
}

function expectNegativeRiskFlag(
  conditionId: ConditionId,
  [yesPosition, noPosition]: BinaryPositions,
): boolean {
  const first = yesPosition ?? noPosition;

  invariant(
    first !== undefined,
    `You have no positions for condition ${conditionId}`,
  );
  invariant(
    isPresent(first.negativeRisk),
    `Missing negativeRisk flag for condition ${conditionId}`,
  );

  if (yesPosition !== undefined && noPosition !== undefined) {
    invariant(
      isPresent(yesPosition.negativeRisk),
      `Missing negativeRisk flag for condition ${conditionId}`,
    );
    invariant(
      isPresent(noPosition.negativeRisk),
      `Missing negativeRisk flag for condition ${conditionId}`,
    );
    invariant(
      yesPosition.negativeRisk === noPosition.negativeRisk,
      `Mixed negativeRisk flags for condition ${conditionId}`,
    );
  }

  return first.negativeRisk;
}

function expectBinaryPositions(
  conditionId: ConditionId,
  positions: readonly Position[],
): BinaryPositions {
  if (positions.length === 0) {
    throw new UserInputError(
      `You have no positions for condition ${conditionId}`,
    );
  }

  invariant(
    positions.length <= 2,
    `Expected at most two positions for condition ${conditionId}`,
  );

  let yesPosition: Position | undefined;
  let noPosition: Position | undefined;

  for (const position of positions) {
    invariant(
      position.outcomeIndex === 0 || position.outcomeIndex === 1,
      `Unexpected outcomeIndex ${position.outcomeIndex} for condition ${conditionId}`,
    );

    if (position.outcomeIndex === 0) {
      invariant(
        yesPosition === undefined,
        `Duplicate YES position for condition ${conditionId}`,
      );
      yesPosition = position;
      continue;
    }

    invariant(
      noPosition === undefined,
      `Duplicate NO position for condition ${conditionId}`,
    );
    noPosition = position;
  }

  return [yesPosition, noPosition];
}

function resolveMergeAmount(
  conditionId: ConditionId,
  positions: BinaryPositions,
  requestedAmount: bigint | 'max',
): PositiveAmount {
  const maxAmount = calculateMaxMergeAmount(positions);

  if (maxAmount === 0n) {
    throw new UserInputError(
      `You have no complementary positions to merge for condition ${conditionId}`,
    );
  }

  if (requestedAmount === 'max') {
    return maxAmount;
  }

  if (requestedAmount > maxAmount) {
    throw new UserInputError(
      `Requested merge amount ${requestedAmount} exceeds the maximum mergeable amount ${maxAmount} for condition ${conditionId}`,
    );
  }

  return requestedAmount;
}

function calculateMaxMergeAmount([
  yesPosition,
  noPosition,
]: BinaryPositions): bigint {
  const yesAmount = toPositionAmount(yesPosition, 0);
  const noAmount = toPositionAmount(noPosition, 1);

  return yesAmount < noAmount ? yesAmount : noAmount;
}

function toPositionAmount(
  position: Position | undefined,
  expectedOutcomeIndex: 0 | 1,
): bigint {
  if (position === undefined) {
    return 0n;
  }

  invariant(
    position.outcomeIndex === expectedOutcomeIndex,
    `Expected outcomeIndex ${expectedOutcomeIndex}`,
  );

  if (isNullish(position.size)) {
    return 0n;
  }

  return toTokenBaseUnits(position.size);
}

function toTokenBaseUnits(size: number): bigint {
  if (!Number.isFinite(size) || size < 0) {
    throw new UserInputError(
      'Position size must be a non-negative finite number',
    );
  }

  return BigInt(Math.floor(size * 1e6));
}
