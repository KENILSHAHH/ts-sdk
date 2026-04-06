import type { EvmAddress, HexString } from '@polymarket/types';

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
