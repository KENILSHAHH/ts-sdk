import { type EvmAddress, type HexString, invariant } from '@polymarket/types';
import { UserInputError } from './errors';
import type { TransactionCall } from './types';

const ERC20_APPROVE_SELECTOR = '095ea7b3';
const ERC20_TRANSFER_SELECTOR = 'a9059cbb';
const ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR = 'a22cb465';
const SAFE_MULTISEND_SELECTOR = '8d80ff0a';

/** @internal */
export const MAX_UINT256 = (1n << 256n) - 1n;

export type Erc20ApprovalCallError = UserInputError;

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

function encodeErc20ApproveCall(
  spender: EvmAddress,
  amount: bigint,
): HexString {
  invariant(amount >= 0n, 'Approval amount must be non-negative');

  const encodedSpender = encodeAddress(spender);
  const encodedAmount = encodeUint256(amount);

  return `0x${ERC20_APPROVE_SELECTOR}${encodedSpender}${encodedAmount}`;
}

function encodeErc1155SetApprovalForAllCall(
  operator: EvmAddress,
  approved: boolean,
): HexString {
  const encodedOperator = encodeAddress(operator);
  const encodedApproved = encodeUint256(approved ? 1n : 0n);

  return `0x${ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR}${encodedOperator}${encodedApproved}`;
}

function encodeErc20TransferCall(
  recipient: EvmAddress,
  amount: bigint,
): HexString {
  const encodedRecipient = encodeAddress(recipient);
  const encodedAmount = encodeUint256(amount);

  return `0x${ERC20_TRANSFER_SELECTOR}${encodedRecipient}${encodedAmount}`;
}

/** @internal */
export function encodeSafeMultisendCall(
  calls: readonly TransactionCall[],
): HexString {
  const encodedTransactions = calls
    .map((call) => encodeSafeMultisendTransaction(call))
    .join('');

  return encodeBytesFunctionCall(SAFE_MULTISEND_SELECTOR, encodedTransactions);
}

function encodeAddress(address: EvmAddress): string {
  return address.slice(2).padStart(64, '0');
}

function encodeAddressPacked(address: EvmAddress): string {
  return address.slice(2);
}

function encodeBytesFunctionCall(selector: string, data: string): HexString {
  const offset = encodeUint256(32n);
  const length = encodeUint256(BigInt(data.length / 2));
  const paddedData = data.padEnd(Math.ceil(data.length / 64) * 64, '0');

  return `0x${selector}${offset}${length}${paddedData}`;
}

function encodeSafeMultisendTransaction(call: TransactionCall): string {
  const data = call.data.slice(2);
  const value = call.value ?? 0n;

  return `${encodeUint8(0)}${encodeAddressPacked(call.to)}${encodeUint256(value)}${encodeUint256(BigInt(data.length / 2))}${data}`;
}

function encodeUint8(value: number): string {
  invariant(value >= 0 && value <= 255, 'Value exceeds uint8 range');
  return value.toString(16).padStart(2, '0');
}

function encodeUint256(value: bigint): string {
  invariant(value >= 0n, 'Value must be non-negative');
  const encoded = value.toString(16);

  invariant(encoded.length <= 64, 'Value exceeds uint256 range');

  return encoded.padStart(64, '0');
}
