import type { TransactionId } from '@polymarket/bindings';
import {
  type EvmAddress,
  type HexString,
  invariant,
  type TxHash,
} from '@polymarket/types';
import type { WaitForGaslessTransactionError } from './actions';

export type TypedDataField = {
  name: string;
  type: string;
};

export type TypedData = Record<string, readonly TypedDataField[]>;

export type TypedDataDomain = {
  chainId?: number;
  name?: string;
  salt?: HexString;
  verifyingContract?: EvmAddress;
  version?: string;
};

export type TypedDataPayload = {
  domain: TypedDataDomain;
  message: Record<string, unknown>;
  primaryType: string;
  types: TypedData;
};

export type TransactionCall = {
  data: HexString;
  to: EvmAddress;
  value?: bigint;
};

export type SignerTransactionRequest = {
  data?: HexString;
  to: EvmAddress;
  value?: bigint;
};

/** @internal */
export type ApiKeyAuthorizationRequest = {
  method: 'DELETE' | 'GET' | 'POST';
  path: string;
  body?: string;
};

export interface ApiKeyAuthorization {
  /** @internal */
  get isBuilderKey(): boolean;

  /** @internal */
  get supportGasless(): boolean;

  /** @internal */
  authorize(request: ApiKeyAuthorizationRequest): Promise<HeadersInit>;
}

export type TransactionOutcome = {
  transactionHash: TxHash;
  transactionId: TransactionId | null;
};

export type WaitForTransactionError = WaitForGaslessTransactionError;

export interface TransactionHandle {
  readonly transactionHash: TxHash | null;
  readonly transactionId: TransactionId | null;
  /**
   * Waits for the submitted transaction to settle.
   *
   * @throws {@link WaitForTransactionError}
   * Thrown when polling times out, the transaction reaches a terminal failure state, or a later read returns an unexpected response.
   */
  wait(): Promise<TransactionOutcome>;
}

/** @internal */
export function expectTransactionHandle(
  value: unknown,
  message = 'Expected a TransactionHandle',
): TransactionHandle {
  invariant(
    typeof value === 'object' &&
      value !== null &&
      'transactionHash' in value &&
      'transactionId' in value &&
      'wait' in value &&
      typeof value.wait === 'function',
    message,
  );
  return value as TransactionHandle;
}
