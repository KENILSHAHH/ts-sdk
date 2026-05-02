import type { ConditionId, DecimalString } from '@polymarket/bindings';
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
import type { BaseSecureClient } from '../clients';
import {
  CancelledSigningError,
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import {
  expectTransactionHandle,
  type SignerTransactionRequest,
  type TransactionHandle,
} from '../types';
import {
  completeWith,
  type SendMergePositionsTransactionRequest,
  type SendRedeemPositionsTransactionRequest,
  type SendSplitPositionTransactionRequest,
  signerTransactionRequest,
} from '../workflow';
import {
  GaslessTransactionMetadataSchema,
  type GaslessWorkflowRequest,
  prepareGaslessTransaction,
} from './gasless';
import { listMarkets } from './markets';
import { listPositions } from './portfolio';

type BinaryPositions =
  | readonly [yes: Position, no: Position | undefined]
  | readonly [yes: undefined, no: Position];

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

const PrepareRedeemPositionsRequestSchema = z.union([
  z.object({
    conditionId: ConditionIdSchema,
    marketId: z.never().optional(),
    metadata: GaslessTransactionMetadataSchema.optional(),
  }),
  z.object({
    conditionId: z.never().optional(),
    marketId: z.string().min(1),
    metadata: GaslessTransactionMetadataSchema.optional(),
  }),
]);

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
export const PrepareSplitPositionError = makeErrorGuard(UserInputError);
export type PrepareMergePositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const PrepareMergePositionsError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);
export type PrepareRedeemPositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const PrepareRedeemPositionsError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Starts a split workflow for a market condition.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const workflow = await prepareSplitPosition(client, {
 *   amount: 1n,
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @throws {@link PrepareSplitPositionError}
 * Thrown on failure.
 */
export async function prepareSplitPosition(
  client: BaseSecureClient,
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
      return expectTransactionHandle(
        yield sendSplitPositionTransaction(
          signerTransactionRequest(client.environment.chainId, call),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata:
        params.metadata ??
        `Split ${params.amount} positions for condition ${params.conditionId}`,
    });
  }.call(null);
}

export type SplitPositionError =
  | PrepareSplitPositionError
  | CancelledSigningError
  | SigningError;
export const SplitPositionError = makeErrorGuard(
  CancelledSigningError,
  SigningError,
  UserInputError,
);

/**
 * Splits collateral into market positions.
 *
 * @throws {@link SplitPositionError}
 * Thrown on failure.
 */
export function splitPosition(
  client: BaseSecureClient,
  request: PrepareSplitPositionRequest,
): Promise<TransactionHandle> {
  return prepareSplitPosition(client, request).then(
    completeWith(client.signer),
  );
}

/**
 * Starts a workflow to merge complementary positions in a market back into collateral.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const workflow = await prepareMergePositions(client, {
 *   amount: 'max',
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @throws {@link PrepareMergePositionsError}
 * Thrown on failure.
 */
export async function prepareMergePositions(
  client: BaseSecureClient,
  request: PrepareMergePositionsRequest,
): Promise<MergePositionsWorkflow> {
  const params = parseUserInput(request, PrepareMergePositionsRequestSchema);
  const positions = await listPositions(client, {
    user: client.account.wallet,
    market: [params.conditionId],
    sizeThreshold: 0,
  })
    .firstPage()
    .then((page) => page.items);
  const binaryPositions = expectBinaryPositions(positions);
  const negativeRisk = expectNegativeRiskFlag(binaryPositions);
  const amount = resolveMergeAmount(binaryPositions, params.amount);
  const call = mergePositionsCall(
    resolveMergeTargetAddress(client, negativeRisk),
    client.environment.collateralToken,
    params.conditionId,
    amount,
    negativeRisk,
  );

  return async function* (): MergePositionsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendMergePositionsTransaction(
          signerTransactionRequest(client.environment.chainId, call),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata:
        params.metadata ??
        `Merge ${amount} positions for condition ${params.conditionId}`,
    });
  }.call(null);
}

export type MergePositionsError =
  | PrepareMergePositionsError
  | CancelledSigningError
  | SigningError;
export const MergePositionsError = makeErrorGuard(
  CancelledSigningError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Merges complementary market positions back into collateral.
 *
 * @throws {@link MergePositionsError}
 * Thrown on failure.
 */
export function mergePositions(
  client: BaseSecureClient,
  request: PrepareMergePositionsRequest,
): Promise<TransactionHandle> {
  return prepareMergePositions(client, request).then(
    completeWith(client.signer),
  );
}

/**
 * Starts a redemption workflow for resolved positions.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const workflow = await prepareRedeemPositions(client, {
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @example
 * ```ts
 * const workflow = await prepareRedeemPositions(client, {
 *   marketId: '12345',
 * });
 * ```
 *
 * @throws {@link PrepareRedeemPositionsError}
 * Thrown on failure.
 */
export async function prepareRedeemPositions(
  client: BaseSecureClient,
  request: PrepareRedeemPositionsRequest,
): Promise<RedeemPositionsWorkflow> {
  const params = parseUserInput(request, PrepareRedeemPositionsRequestSchema);
  const positions = await listPositions(client, {
    user: client.account.wallet,
    market: [params.conditionId ?? params.marketId],
    sizeThreshold: 0,
  })
    .firstPage()
    .then((page) => page.items);
  const binaryPositions = expectBinaryPositions(positions);
  const conditionId = resolveBinaryPositionsConditionId(binaryPositions);
  const negativeRisk = expectNegativeRiskFlag(binaryPositions);
  const call = negativeRisk
    ? negRiskRedeemPositionsCall(
        client.environment.negRiskAdapter,
        conditionId,
        deriveNegRiskRedeemAmounts(binaryPositions),
      )
    : ctfRedeemPositionsCall(
        client.environment.conditionalTokens,
        client.environment.collateralToken,
        conditionId,
      );

  return async function* (): RedeemPositionsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      return expectTransactionHandle(
        yield sendRedeemPositionsTransaction(
          signerTransactionRequest(client.environment.chainId, call),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [call],
      metadata:
        params.metadata ?? `Redeem positions for condition ${conditionId}`,
    });
  }.call(null);
}

export type RedeemPositionsError =
  | PrepareRedeemPositionsError
  | CancelledSigningError
  | SigningError;
export const RedeemPositionsError = makeErrorGuard(
  CancelledSigningError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Redeems resolved market positions.
 *
 * @throws {@link RedeemPositionsError}
 * Thrown on failure.
 */
export function redeemPositions(
  client: BaseSecureClient,
  request: PrepareRedeemPositionsRequest,
): Promise<TransactionHandle> {
  return prepareRedeemPositions(client, request).then(
    completeWith(client.signer),
  );
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

function resolveSplitTargetAddress(client: BaseSecureClient, negRisk: boolean) {
  return negRisk
    ? client.environment.negRiskAdapter
    : client.environment.conditionalTokens;
}

async function resolveMarketNegativeRiskFlag(
  client: BaseSecureClient,
  conditionId: ConditionId,
): Promise<boolean> {
  const page = await listMarkets(client, {
    conditionIds: [conditionId],
    pageSize: 2,
  }).firstPage();
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
    isPresent(market.state.negRisk),
    `Missing negRisk flag for condition ${conditionId}`,
  );

  return market.state.negRisk;
}

function resolveMergeTargetAddress(client: BaseSecureClient, negRisk: boolean) {
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

function expectNegativeRiskFlag([
  yesPosition,
  noPosition,
]: BinaryPositions): boolean {
  const first = yesPosition ?? noPosition;
  const conditionId = first.conditionId;

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
  positions: readonly Position[],
): BinaryPositions {
  const firstPosition = positions[0];

  if (firstPosition === undefined) {
    throw new UserInputError('You have no positions');
  }

  const conditionId = firstPosition.conditionId;

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

  if (yesPosition !== undefined) {
    return [yesPosition, noPosition];
  }

  invariant(
    noPosition !== undefined,
    `Expected positions for condition ${conditionId}`,
  );

  return [undefined, noPosition];
}

function resolveBinaryPositionsConditionId(
  positions: BinaryPositions,
): ConditionId {
  return (positions[0] ?? positions[1]).conditionId;
}

function resolveMergeAmount(
  positions: BinaryPositions,
  requestedAmount: bigint | 'max',
): PositiveAmount {
  const maxAmount = calculateMaxMergeAmount(positions);
  const conditionId = resolveBinaryPositionsConditionId(positions);

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

function toTokenBaseUnits(size: DecimalString): bigint {
  const numericSize = Number(size);

  if (!Number.isFinite(numericSize) || numericSize < 0) {
    throw new UserInputError(
      'Position size must be a non-negative finite number',
    );
  }

  return BigInt(Math.floor(numericSize * 1e6));
}
