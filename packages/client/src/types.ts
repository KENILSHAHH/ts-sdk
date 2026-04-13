import type { TransactionId } from '@polymarket/bindings';
import type { EvmAddress, HexString, TxHash } from '@polymarket/types';

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

export interface TransactionHandle {
  readonly transactionHash: TxHash | null;
  readonly transactionId: TransactionId | null;
  wait(): Promise<TransactionOutcome>;
}
