import { encode } from '@msgpack/msgpack';
import type { EvmSignature, PrivateKey } from '@polymarket/types';
import { expectEvmSignature } from '@polymarket/types';
import { Hash, Secp256k1, Signature, TypedData } from 'ox';
import type { TypedDataPayload } from '../../types';

type MsgpackValue =
  | boolean
  | number
  | string
  | readonly MsgpackValue[]
  | undefined;

export type PerpsSignedOp = readonly MsgpackValue[];

export type SignPerpsOpRequest = {
  chainId: number;
  op: PerpsSignedOp;
  privateKey: PrivateKey;
  salt: number;
  timestamp: number;
};

export type CreatePerpsOpTypedDataPayloadRequest = Omit<
  SignPerpsOpRequest,
  'privateKey'
>;

export function signPerpsOp(request: SignPerpsOpRequest): EvmSignature {
  const payload = TypedData.getSignPayload(
    createPerpsOpTypedDataPayload(request),
  );
  return expectEvmSignature(
    Signature.toHex(
      Secp256k1.sign({ payload, privateKey: request.privateKey }),
    ),
  );
}

export function createPerpsOpTypedDataPayload(
  request: CreatePerpsOpTypedDataPayloadRequest,
): TypedDataPayload {
  return {
    domain: {
      chainId: request.chainId,
      name: 'Polymarket',
      version: '1',
    },
    message: {
      data: Hash.keccak256(encode(request.op), { as: 'Hex' }),
      salt: BigInt(request.salt),
      ts: BigInt(request.timestamp),
    },
    primaryType: 'Op',
    types: {
      Op: [
        { name: 'data', type: 'bytes32' },
        { name: 'salt', type: 'uint64' },
        { name: 'ts', type: 'uint64' },
      ],
    },
  };
}
