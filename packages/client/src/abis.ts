import type { ConditionId } from '@polymarket/bindings';
import { type EvmAddress, type HexString, invariant } from '@polymarket/types';
import { AbiFunction, AbiParameters } from 'ox';
import { makeErrorGuard, UserInputError } from './errors';
import type { TransactionCall } from './types';

const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC20_APPROVE_FUNCTION = AbiFunction.from(
  'function approve(address spender, uint256 amount)',
);
const ERC20_TRANSFER_FUNCTION = AbiFunction.from(
  'function transfer(address recipient, uint256 amount)',
);
const ERC1155_SET_APPROVAL_FOR_ALL_FUNCTION = AbiFunction.from(
  'function setApprovalForAll(address operator, bool approved)',
);
const CTF_SPLIT_POSITION_FUNCTION = AbiFunction.from(
  'function splitPosition(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)',
);
const CTF_MERGE_POSITIONS_FUNCTION = AbiFunction.from(
  'function mergePositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)',
);
const CTF_REDEEM_POSITIONS_FUNCTION = AbiFunction.from(
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)',
);
const NEG_RISK_REDEEM_POSITIONS_FUNCTION = AbiFunction.from(
  'function redeemPositions(bytes32 _conditionId, uint256[] _amounts)',
);
const SAFE_MULTISEND_FUNCTION = AbiFunction.from('function multiSend(bytes)');
const BINARY_OUTCOME_PARTITION = [1n, 2n] as const;
const BINARY_OUTCOME_INDEX_SETS = [1n, 2n] as const;

/** @internal */
export const MAX_UINT256 = (1n << 256n) - 1n;

export type Erc20ApprovalCallError = UserInputError;
export const Erc20ApprovalCallError = makeErrorGuard(UserInputError);

/**
 * Creates a transaction call for `approve(address,uint256)` on an ERC-20 token.
 *
 * @throws {@link Erc20ApprovalCallError}
 * Thrown when the approval amount is invalid.
 */
export function erc20ApprovalCall(
  tokenAddress: EvmAddress,
  spender: EvmAddress,
  amount: bigint,
): TransactionCall {
  if (amount < 0n) {
    throw new UserInputError('Approval amount must be non-negative');
  }

  if (amount > MAX_UINT256) {
    throw new UserInputError('Approval amount exceeds uint256 range');
  }

  return {
    data: encodeErc20ApproveCall(spender, amount),
    to: tokenAddress,
  };
}

/**
 * Creates a transaction call for `setApprovalForAll(address,bool)` on an ERC-1155 token.
 */
export function erc1155ApprovalForAllCall(
  tokenAddress: EvmAddress,
  operator: EvmAddress,
  approved: boolean,
): TransactionCall {
  return {
    data: encodeErc1155SetApprovalForAllCall(operator, approved),
    to: tokenAddress,
  };
}

export type Erc20TransferCallError = UserInputError;
export const Erc20TransferCallError = makeErrorGuard(UserInputError);

/**
 * Creates a transaction call for `transfer(address,uint256)` on an ERC-20 token.
 *
 * @throws {@link Erc20TransferCallError}
 * Thrown when the transfer amount is invalid.
 */
export function erc20TransferCall(
  tokenAddress: EvmAddress,
  recipient: EvmAddress,
  amount: bigint,
): TransactionCall {
  if (amount < 0n) {
    throw new UserInputError('Transfer amount must be non-negative');
  }

  if (amount > MAX_UINT256) {
    throw new UserInputError('Transfer amount exceeds uint256 range');
  }

  return {
    data: encodeErc20TransferCall(recipient, amount),
    to: tokenAddress,
  };
}

export type CtfRedeemPositionsCallError = UserInputError;
export const CtfRedeemPositionsCallError = makeErrorGuard(UserInputError);

export type SplitPositionCallError = UserInputError;
export const SplitPositionCallError = makeErrorGuard(UserInputError);

/**
 * Creates a transaction call for `splitPosition(address,bytes32,bytes32,uint256[],uint256)`.
 * Works with both the Conditional Tokens contract and the neg-risk adapter.
 *
 * @remarks
 * This is a low-level transaction builder that most SDK consumers will not need.
 *
 * @throws {@link SplitPositionCallError}
 * Thrown when the amount is invalid.
 */
export function splitPositionCall(
  targetAddress: EvmAddress,
  collateralTokenAddress: EvmAddress,
  conditionId: ConditionId,
  amount: bigint,
  negRisk = false,
): TransactionCall {
  return {
    data: encodeSplitPositionCall(
      collateralTokenAddress,
      conditionId,
      amount,
      negRisk,
    ),
    to: targetAddress,
  };
}

export type MergePositionsCallError = UserInputError;
export const MergePositionsCallError = makeErrorGuard(UserInputError);

/**
 * Creates a transaction call for `mergePositions(address,bytes32,bytes32,uint256[],uint256)`.
 * Works with both the Conditional Tokens contract and the neg-risk adapter.
 *
 * @remarks
 * This is a low-level transaction builder that most SDK consumers will not need.
 *
 * @throws {@link MergePositionsCallError}
 * Thrown when the amount is invalid.
 */
export function mergePositionsCall(
  targetAddress: EvmAddress,
  collateralTokenAddress: EvmAddress,
  conditionId: ConditionId,
  amount: bigint,
  negRisk = false,
): TransactionCall {
  return {
    data: encodeMergePositionsCall(
      collateralTokenAddress,
      conditionId,
      amount,
      negRisk,
    ),
    to: targetAddress,
  };
}

/**
 * Creates a transaction call for `redeemPositions(address,bytes32,bytes32,uint256[])`
 * on the Conditional Tokens contract.
 *
 * @remarks
 * This is a low-level transaction builder that most SDK consumers will not need.
 *
 * @throws {@link CtfRedeemPositionsCallError}
 * Thrown when the condition is invalid.
 */
export function ctfRedeemPositionsCall(
  conditionalTokensAddress: EvmAddress,
  collateralTokenAddress: EvmAddress,
  conditionId: ConditionId,
): TransactionCall {
  return {
    data: encodeCtfRedeemPositionsCall(collateralTokenAddress, conditionId),
    to: conditionalTokensAddress,
  };
}

export type NegRiskRedeemPositionsCallError = UserInputError;
export const NegRiskRedeemPositionsCallError = makeErrorGuard(UserInputError);

/**
 * Creates a transaction call for `redeemPositions(bytes32,uint256[])` on the
 * negative-risk adapter contract.
 *
 * @remarks
 * This is a low-level transaction builder that most SDK consumers will not need.
 *
 * @throws {@link NegRiskRedeemPositionsCallError}
 * Thrown when the condition or redeem amounts are invalid.
 */
export function negRiskRedeemPositionsCall(
  negRiskAdapterAddress: EvmAddress,
  conditionId: ConditionId,
  amounts: readonly [bigint, bigint],
): TransactionCall {
  return {
    data: encodeNegRiskRedeemPositionsCall(conditionId, amounts),
    to: negRiskAdapterAddress,
  };
}

function encodeErc20ApproveCall(
  spender: EvmAddress,
  amount: bigint,
): HexString {
  invariant(amount >= 0n, 'Approval amount must be non-negative');

  return AbiFunction.encodeData(ERC20_APPROVE_FUNCTION, [spender, amount]);
}

function encodeErc1155SetApprovalForAllCall(
  operator: EvmAddress,
  approved: boolean,
): HexString {
  return AbiFunction.encodeData(ERC1155_SET_APPROVAL_FOR_ALL_FUNCTION, [
    operator,
    approved,
  ]);
}

function encodeErc20TransferCall(
  recipient: EvmAddress,
  amount: bigint,
): HexString {
  return AbiFunction.encodeData(ERC20_TRANSFER_FUNCTION, [recipient, amount]);
}

function encodeSplitPositionCall(
  collateralTokenAddress: EvmAddress,
  conditionId: ConditionId,
  amount: bigint,
  negRisk: boolean,
): HexString {
  return AbiFunction.encodeData(CTF_SPLIT_POSITION_FUNCTION, [
    collateralTokenAddress,
    ZERO_BYTES32,
    conditionId,
    negRisk ? [] : BINARY_OUTCOME_PARTITION,
    expectUint256(amount, 'Split amount'),
  ]);
}

function encodeMergePositionsCall(
  collateralTokenAddress: EvmAddress,
  conditionId: ConditionId,
  amount: bigint,
  negRisk: boolean,
): HexString {
  return AbiFunction.encodeData(CTF_MERGE_POSITIONS_FUNCTION, [
    collateralTokenAddress,
    ZERO_BYTES32,
    conditionId,
    negRisk ? [] : BINARY_OUTCOME_PARTITION,
    expectUint256(amount, 'Merge amount'),
  ]);
}

function encodeCtfRedeemPositionsCall(
  collateralTokenAddress: EvmAddress,
  conditionId: ConditionId,
): HexString {
  return AbiFunction.encodeData(CTF_REDEEM_POSITIONS_FUNCTION, [
    collateralTokenAddress,
    ZERO_BYTES32,
    conditionId,
    BINARY_OUTCOME_INDEX_SETS,
  ]);
}

function encodeNegRiskRedeemPositionsCall(
  conditionId: ConditionId,
  amounts: readonly [bigint, bigint],
): HexString {
  return AbiFunction.encodeData(NEG_RISK_REDEEM_POSITIONS_FUNCTION, [
    conditionId,
    amounts.map((amount) => expectUint256(amount, 'Redeem amount')),
  ]);
}

function expectUint256(value: bigint, label: string): bigint {
  if (value < 0n) {
    throw new UserInputError(`${label} must be non-negative`);
  }

  if (value > MAX_UINT256) {
    throw new UserInputError(`${label} exceeds uint256 range`);
  }

  return value;
}

/** @internal */
export function encodeSafeMultisendCall(
  calls: readonly TransactionCall[],
): HexString {
  const encodedTransactions = calls.map((call) =>
    encodeSafeMultisendTransaction(call),
  );

  return AbiFunction.encodeData(SAFE_MULTISEND_FUNCTION, [
    encodedTransactions.length === 0
      ? '0x'
      : AbiParameters.encodePacked(
          Array.from({ length: encodedTransactions.length }, () => 'bytes'),
          encodedTransactions,
        ),
  ]);
}

function encodeSafeMultisendTransaction(call: TransactionCall): HexString {
  const value = call.value ?? 0n;

  return AbiParameters.encodePacked(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
    [0, call.to, value, BigInt((call.data.length - 2) / 2), call.data],
  );
}
