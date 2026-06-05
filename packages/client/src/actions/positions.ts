import type {
  ConditionId,
  DecimalString,
  PositionId,
} from '@polymarket/bindings';
import { ConditionIdSchema, PositionIdSchema } from '@polymarket/bindings';
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
  combinatorialPrepareConditionCall,
  ctfRedeemPositionsCall,
  decodeErc1155BalanceOfResult,
  erc1155BalanceOfCall,
  mergePositionsCall,
  mergeV2Call,
  redeemV2Call,
  splitPositionCall,
  splitV2Call,
} from '../abis';
import type { BaseSecureClient } from '../clients';
import {
  CancelledSigningError,
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TimeoutError,
  TransactionFailedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import {
  type CanonicalComboLegs,
  canonicalizeComboLegs,
  decodeComboPositionId,
  deriveComboConditionId,
} from '../protocol';
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
  type WaitForGaslessTransactionError,
} from './gasless';
import { listMarkets } from './markets';
import { listPositions } from './portfolio';

type BinaryPositions =
  | readonly [yes: Position, no: Position | undefined]
  | readonly [yes: undefined, no: Position];

type PositiveAmount = bigint;

/**
 * Parameters for preparing a market position split.
 */
export type PrepareSplitMarketPositionRequest = {
  /** Amount of collateral to convert into market positions. */
  amount: bigint;
  /** Existing market condition ID that identifies the positions to mint. */
  conditionId: string | ConditionId;
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing a combo position split.
 */
export type PrepareSplitComboPositionRequest = {
  /** Amount of collateral to convert into combo positions. */
  amount: bigint;
  /** Protocol v2 leg position IDs that define the combo condition. */
  legs: string[] | PositionId[];
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing either supported position split workflow.
 *
 * @remarks
 * Provide either a market `conditionId` or combo `legs`.
 */
export type PrepareSplitPositionRequest =
  | PrepareSplitMarketPositionRequest
  | PrepareSplitComboPositionRequest;

const PrepareSplitMarketPositionRequestSchema = z.object({
  amount: z.bigint().min(0n),
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareSplitMarketPositionRequest>;

const PrepareSplitComboPositionInputSchema = z.object({
  amount: z.bigint().positive(),
  legs: z.array(PositionIdSchema).min(1).max(50),
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareSplitComboPositionRequest>;

type ParsedSplitComboPositionRequest = {
  amount: bigint;
  legs: CanonicalComboLegs;
  metadata?: string;
};

const CanonicalComboLegsSchema = z
  .array(PositionIdSchema)
  .min(1)
  .max(50)
  .transform(canonicalizeComboLegs);

const PrepareSplitComboPositionRequestSchema = z.object({
  amount: z.bigint().positive(),
  legs: CanonicalComboLegsSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<
  ParsedSplitComboPositionRequest,
  PrepareSplitComboPositionRequest
>;

const PrepareSplitPositionRequestSchema = z.union([
  PrepareSplitMarketPositionRequestSchema.extend({
    legs: z.never().optional(),
  }),
  PrepareSplitComboPositionInputSchema.extend({
    conditionId: z.never().optional(),
  }),
]) satisfies z.ZodType<PrepareSplitPositionRequest>;

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

export type PrepareSplitPositionError = UserInputError;
export const PrepareSplitPositionError = makeErrorGuard(UserInputError);
export type PrepareSplitMarketPositionError = PrepareSplitPositionError;
export const PrepareSplitMarketPositionError = PrepareSplitPositionError;
export type PrepareSplitComboPositionError = PrepareSplitPositionError;
export const PrepareSplitComboPositionError = PrepareSplitPositionError;
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
export type PrepareMergeMarketPositionError = PrepareMergePositionsError;
export const PrepareMergeMarketPositionError = PrepareMergePositionsError;
export type PrepareMergeComboPositionError = PrepareMergePositionsError;
export const PrepareMergeComboPositionError = PrepareMergePositionsError;
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
export type PrepareRedeemMarketPositionsError = PrepareRedeemPositionsError;
export const PrepareRedeemMarketPositionsError = PrepareRedeemPositionsError;
export type PrepareRedeemComboPositionError = PrepareRedeemPositionsError;
export const PrepareRedeemComboPositionError = PrepareRedeemPositionsError;

/**
 * Starts a split workflow for a market condition.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const workflow = await prepareSplitMarketPosition(client, {
 *   amount: 1n,
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @throws {@link PrepareSplitMarketPositionError}
 * Thrown on failure.
 */
export async function prepareSplitMarketPosition(
  client: BaseSecureClient,
  request: PrepareSplitMarketPositionRequest,
): Promise<SplitPositionWorkflow> {
  const params = parseUserInput(
    request,
    PrepareSplitMarketPositionRequestSchema,
  );
  const negativeRisk = await resolveMarketNegativeRiskFlag(
    client,
    params.conditionId,
  );
  const call = splitPositionCall(
    resolveLifecycleTargetAddress(client, negativeRisk),
    client.environment.collateralToken,
    params.conditionId,
    params.amount,
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

/**
 * Starts a split workflow for a combo position from leg position IDs.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const workflow = await prepareSplitComboPosition(client, {
 *   amount: 1n,
 *   legs: ['123', '456'],
 * });
 * ```
 *
 * @throws {@link PrepareSplitComboPositionError}
 * Thrown on failure.
 */
export async function prepareSplitComboPosition(
  client: BaseSecureClient,
  request: PrepareSplitComboPositionRequest,
): Promise<SplitPositionWorkflow> {
  const params = parseUserInput(
    request,
    PrepareSplitComboPositionRequestSchema,
  );
  const prepareConditionCall = combinatorialPrepareConditionCall(
    client.environment.combinatorialModule,
    params.legs,
  );
  const conditionId = deriveComboConditionId(params.legs);
  const splitCall = splitV2Call(
    client.environment.protocolV2Router,
    conditionId,
    params.amount,
  );

  return async function* (): SplitPositionWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      const prepareHandle = expectTransactionHandle(
        yield sendSplitPositionTransaction(
          signerTransactionRequest(
            client.environment.chainId,
            prepareConditionCall,
          ),
        ),
      );
      await prepareHandle.wait();

      return expectTransactionHandle(
        yield sendSplitPositionTransaction(
          signerTransactionRequest(client.environment.chainId, splitCall),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [prepareConditionCall, splitCall],
      metadata:
        params.metadata ??
        `Split ${params.amount} combo positions for condition ${conditionId}`,
    });
  }.call(null);
}

/**
 * Starts a split workflow for market or combo positions.
 *
 * @throws {@link PrepareSplitPositionError}
 * Thrown on failure.
 */
export async function prepareSplitPosition(
  client: BaseSecureClient,
  request: PrepareSplitPositionRequest,
): Promise<SplitPositionWorkflow> {
  const params = parseUserInput(request, PrepareSplitPositionRequestSchema);

  if (params.legs !== undefined) {
    return prepareSplitComboPosition(client, params);
  }

  return prepareSplitMarketPosition(client, params);
}

export type SplitPositionError =
  | PrepareSplitPositionError
  | CancelledSigningError
  | SigningError
  | WaitForGaslessTransactionError;
export const SplitPositionError = makeErrorGuard(
  CancelledSigningError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TimeoutError,
  TransactionFailedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);
export type SplitMarketPositionError = SplitPositionError;
export const SplitMarketPositionError = SplitPositionError;
export type SplitComboPositionError = SplitPositionError;
export const SplitComboPositionError = SplitPositionError;

/**
 * Splits collateral into market positions.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link SplitMarketPositionError}
 * Thrown on failure.
 */
export function splitMarketPosition(
  client: BaseSecureClient,
  request: PrepareSplitMarketPositionRequest,
): Promise<TransactionHandle> {
  return prepareSplitMarketPosition(client, request).then(
    completeWith(client.signer),
  );
}

/**
 * Splits collateral into combo positions from leg position IDs.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link SplitComboPositionError}
 * Thrown on failure.
 */
export function splitComboPosition(
  client: BaseSecureClient,
  request: PrepareSplitComboPositionRequest,
): Promise<TransactionHandle> {
  return prepareSplitComboPosition(client, request).then(
    completeWith(client.signer),
  );
}

/**
 * Splits collateral into market or combo positions.
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
 * Parameters for preparing a market position merge.
 */
export type PrepareMergeMarketPositionRequest = {
  /** Amount per complementary market position to merge. */
  amount: bigint | 'max';
  /** Existing market condition ID that identifies the positions to merge. */
  conditionId: string | ConditionId;
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing a combo position merge.
 */
export type PrepareMergeComboPositionRequest = {
  /** Amount per complementary combo position to merge. */
  amount: bigint;
  /** Protocol v2 leg position IDs that define the combo condition. */
  legs: string[] | PositionId[];
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing either supported position merge workflow.
 *
 * @remarks
 * Provide either a market `conditionId` or combo `legs`.
 */
export type PrepareMergePositionsRequest =
  | PrepareMergeMarketPositionRequest
  | PrepareMergeComboPositionRequest;

type ParsedMergeComboPositionRequest = {
  amount: bigint;
  legs: CanonicalComboLegs;
  metadata?: string;
};

const PrepareMergeMarketPositionRequestSchema = z.object({
  amount: z.union([z.bigint().positive(), z.literal('max')]),
  conditionId: ConditionIdSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareMergeMarketPositionRequest>;

const PrepareMergeComboPositionInputSchema = z.object({
  amount: z.bigint().positive(),
  legs: z.array(PositionIdSchema).min(1).max(50),
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareMergeComboPositionRequest>;

const PrepareMergeComboPositionRequestSchema = z.object({
  amount: z.bigint().positive(),
  legs: CanonicalComboLegsSchema,
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<
  ParsedMergeComboPositionRequest,
  PrepareMergeComboPositionRequest
>;

const PrepareMergePositionsRequestSchema = z.union([
  PrepareMergeMarketPositionRequestSchema.extend({
    legs: z.never().optional(),
  }),
  PrepareMergeComboPositionInputSchema.extend({
    conditionId: z.never().optional(),
  }),
]) satisfies z.ZodType<PrepareMergePositionsRequest>;

/**
 * Starts a workflow to merge complementary positions in a market back into collateral.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const workflow = await prepareMergeMarketPosition(client, {
 *   amount: 'max',
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @throws {@link PrepareMergeMarketPositionError}
 * Thrown on failure.
 */
export async function prepareMergeMarketPosition(
  client: BaseSecureClient,
  request: PrepareMergeMarketPositionRequest,
): Promise<MergePositionsWorkflow> {
  const params = parseUserInput(
    request,
    PrepareMergeMarketPositionRequestSchema,
  );
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
    resolveLifecycleTargetAddress(client, negativeRisk),
    client.environment.collateralToken,
    params.conditionId,
    amount,
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

/**
 * Starts a workflow to merge complementary combo positions back into collateral.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const workflow = await prepareMergeComboPosition(client, {
 *   amount: 1n,
 *   legs: ['123', '456'],
 * });
 * ```
 *
 * @throws {@link PrepareMergeComboPositionError}
 * Thrown on failure.
 */
export async function prepareMergeComboPosition(
  client: BaseSecureClient,
  request: PrepareMergeComboPositionRequest,
): Promise<MergePositionsWorkflow> {
  const params = parseUserInput(
    request,
    PrepareMergeComboPositionRequestSchema,
  );
  const prepareConditionCall = combinatorialPrepareConditionCall(
    client.environment.combinatorialModule,
    params.legs,
  );
  const conditionId = deriveComboConditionId(params.legs);
  const mergeCall = mergeV2Call(
    client.environment.protocolV2Router,
    conditionId,
    params.amount,
  );

  return async function* (): MergePositionsWorkflow {
    if (client.account.walletType === WalletType.EOA) {
      const prepareHandle = expectTransactionHandle(
        yield sendMergePositionsTransaction(
          signerTransactionRequest(
            client.environment.chainId,
            prepareConditionCall,
          ),
        ),
      );
      await prepareHandle.wait();

      return expectTransactionHandle(
        yield sendMergePositionsTransaction(
          signerTransactionRequest(client.environment.chainId, mergeCall),
        ),
      );
    }

    return yield* await prepareGaslessTransaction(client, {
      calls: [prepareConditionCall, mergeCall],
      metadata:
        params.metadata ??
        `Merge ${params.amount} combo positions for condition ${conditionId}`,
    });
  }.call(null);
}

/**
 * Starts a merge workflow for market or combo positions.
 *
 * @throws {@link PrepareMergePositionsError}
 * Thrown on failure.
 */
export async function prepareMergePositions(
  client: BaseSecureClient,
  request: PrepareMergePositionsRequest,
): Promise<MergePositionsWorkflow> {
  const params = parseUserInput(request, PrepareMergePositionsRequestSchema);

  if (params.legs !== undefined) {
    return prepareMergeComboPosition(client, params);
  }

  return prepareMergeMarketPosition(client, params);
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
export type MergeMarketPositionError = MergePositionsError;
export const MergeMarketPositionError = MergePositionsError;
export type MergeComboPositionError = MergePositionsError;
export const MergeComboPositionError = MergePositionsError;

/**
 * Merges complementary market positions back into collateral.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link MergeMarketPositionError}
 * Thrown on failure.
 */
export function mergeMarketPosition(
  client: BaseSecureClient,
  request: PrepareMergeMarketPositionRequest,
): Promise<TransactionHandle> {
  return prepareMergeMarketPosition(client, request).then(
    completeWith(client.signer),
  );
}

/**
 * Merges complementary combo positions back into collateral.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link MergeComboPositionError}
 * Thrown on failure.
 */
export function mergeComboPosition(
  client: BaseSecureClient,
  request: PrepareMergeComboPositionRequest,
): Promise<TransactionHandle> {
  return prepareMergeComboPosition(client, request).then(
    completeWith(client.signer),
  );
}

/**
 * Merges complementary market or combo positions back into collateral.
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
 * Parameters for preparing a market position redemption by condition ID.
 */
export type PrepareRedeemMarketPositionsByConditionIdRequest = {
  /** Existing market condition ID that identifies the positions to redeem. */
  conditionId: string | ConditionId;
  marketId?: never;
  amount?: never;
  positionId?: never;
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing a market position redemption by market ID.
 */
export type PrepareRedeemMarketPositionsByMarketIdRequest = {
  conditionId?: never;
  /** Existing market ID that identifies the positions to redeem. */
  marketId: string;
  amount?: never;
  positionId?: never;
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing a combo position redemption.
 */
export type PrepareRedeemComboPositionRequest = {
  /** Protocol v2 combo YES/NO position ID to redeem. */
  positionId: string | PositionId;
  conditionId?: never;
  marketId?: never;
  /** Optional transaction metadata for workflows that support metadata. */
  metadata?: string;
};

/**
 * Parameters for preparing either supported position redemption workflow.
 *
 * @remarks
 * Provide either a market `conditionId` or `marketId`, or a combo `positionId`.
 */
export type PrepareRedeemPositionsRequest =
  | PrepareRedeemMarketPositionsByConditionIdRequest
  | PrepareRedeemMarketPositionsByMarketIdRequest
  | PrepareRedeemComboPositionRequest;

export type PrepareRedeemMarketPositionsRequest = Extract<
  PrepareRedeemPositionsRequest,
  | PrepareRedeemMarketPositionsByConditionIdRequest
  | PrepareRedeemMarketPositionsByMarketIdRequest
>;

const PrepareRedeemMarketPositionsByConditionIdRequestSchema = z.object({
  conditionId: ConditionIdSchema,
  marketId: z.never().optional(),
  amount: z.never().optional(),
  positionId: z.never().optional(),
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareRedeemMarketPositionsByConditionIdRequest>;

const PrepareRedeemMarketPositionsByMarketIdRequestSchema = z.object({
  conditionId: z.never().optional(),
  marketId: z.string().min(1),
  amount: z.never().optional(),
  positionId: z.never().optional(),
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareRedeemMarketPositionsByMarketIdRequest>;

const PrepareRedeemMarketPositionsRequestSchema = z.union([
  PrepareRedeemMarketPositionsByConditionIdRequestSchema,
  PrepareRedeemMarketPositionsByMarketIdRequestSchema,
]) satisfies z.ZodType<PrepareRedeemMarketPositionsRequest>;

const PrepareRedeemComboPositionRequestSchema = z.object({
  positionId: PositionIdSchema,
  conditionId: z.never().optional(),
  marketId: z.never().optional(),
  metadata: GaslessTransactionMetadataSchema.optional(),
}) satisfies z.ZodType<PrepareRedeemComboPositionRequest>;

const PrepareRedeemPositionsRequestSchema = z.union([
  PrepareRedeemMarketPositionsByConditionIdRequestSchema,
  PrepareRedeemMarketPositionsByMarketIdRequestSchema,
  PrepareRedeemComboPositionRequestSchema,
]) satisfies z.ZodType<PrepareRedeemPositionsRequest>;

/**
 * Starts a redemption workflow for resolved market positions.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const workflow = await prepareRedeemMarketPositions(client, {
 *   conditionId:
 *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 * });
 * ```
 *
 * @example
 * ```ts
 * const workflow = await prepareRedeemMarketPositions(client, {
 *   marketId: '12345',
 * });
 * ```
 *
 * @throws {@link PrepareRedeemMarketPositionsError}
 * Thrown on failure.
 */
export async function prepareRedeemMarketPositions(
  client: BaseSecureClient,
  request: PrepareRedeemMarketPositionsRequest,
): Promise<RedeemPositionsWorkflow> {
  const params = parseUserInput(
    request,
    PrepareRedeemMarketPositionsRequestSchema,
  );
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
  const call = ctfRedeemPositionsCall(
    resolveLifecycleTargetAddress(client, negativeRisk),
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

/**
 * Starts a redemption workflow for a resolved combo position.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const workflow = await prepareRedeemComboPosition(client, {
 *   positionId: '123',
 * });
 * ```
 *
 * @throws {@link PrepareRedeemComboPositionError}
 * Thrown on failure.
 */
export async function prepareRedeemComboPosition(
  client: BaseSecureClient,
  request: PrepareRedeemComboPositionRequest,
): Promise<RedeemPositionsWorkflow> {
  const params = parseUserInput(
    request,
    PrepareRedeemComboPositionRequestSchema,
  );
  const decoded = decodeComboPositionId(params.positionId);
  const balance = decodeErc1155BalanceOfResult(
    await client.rpc.ethCall(
      erc1155BalanceOfCall(
        client.environment.positionManager,
        client.account.wallet,
        decoded.positionId,
      ),
    ),
  );

  if (balance === 0n) {
    throw new UserInputError('Combo position has no balance to redeem');
  }

  const call = redeemV2Call(
    client.environment.protocolV2Router,
    decoded.conditionId,
    decoded.outcomeIndex,
    balance,
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
      metadata: params.metadata ?? `Redeem combo position ${params.positionId}`,
    });
  }.call(null);
}

/**
 * Starts a redemption workflow for resolved market or combo positions.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link PrepareRedeemPositionsError}
 * Thrown on failure.
 */
export async function prepareRedeemPositions(
  client: BaseSecureClient,
  request: PrepareRedeemPositionsRequest,
): Promise<RedeemPositionsWorkflow> {
  const params = parseUserInput(request, PrepareRedeemPositionsRequestSchema);

  if (params.positionId !== undefined) {
    return prepareRedeemComboPosition(client, params);
  }

  return prepareRedeemMarketPositions(client, params);
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
 * Redeems resolved market or combo positions.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
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

function resolveLifecycleTargetAddress(
  client: BaseSecureClient,
  negRisk: boolean,
) {
  return negRisk
    ? client.environment.negRiskCollateralAdapter
    : client.environment.collateralAdapter;
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
