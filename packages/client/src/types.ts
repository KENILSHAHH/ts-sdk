export type TypedDataField = {
  name: string;
  type: string;
};

export type TypedData = Record<string, readonly TypedDataField[]>;

export type TypedDataDomain = {
  chainId?: number;
  name?: string;
  salt?: `0x${string}`;
  verifyingContract?: string;
  version?: string;
};

export type TypedDataPayload = {
  domain: TypedDataDomain;
  message: Record<string, unknown>;
  primaryType: string;
  types: TypedData;
};

export type TypedDataSigner = {
  getAddress(): Promise<string>;
  signTypedData(payload: TypedDataPayload): Promise<string>;
};
