import type { EvmAddress, Signature } from '@polymarket/types';
import type { SecureClient } from './clients';
import type { TypedDataPayload } from './types';

export type AuthenticationWorkflowRequest =
  | { kind: 'requestAddress' }
  | {
      kind: 'signTypedData';
      payload: TypedDataPayload;
    };

export type AuthenticationWorkflow = AsyncGenerator<
  AuthenticationWorkflowRequest,
  SecureClient,
  EvmAddress | Signature
>;

export type CreateL2AuthTypedDataPayloadRequest = {
  address: EvmAddress;
  chainId: number;
  nonce?: number;
  timestamp: number;
};

/** @internal */
export function createL2AuthTypedDataPayload(
  request: CreateL2AuthTypedDataPayloadRequest,
): TypedDataPayload {
  return {
    domain: {
      chainId: request.chainId,
      name: 'ClobAuthDomain',
      version: '1',
    },
    message: {
      address: request.address,
      message: 'This message attests that I control the given wallet',
      nonce: request.nonce ?? 0,
      timestamp: `${request.timestamp}`,
    },
    primaryType: 'ClobAuth',
    types: {
      ClobAuth: [
        { name: 'address', type: 'address' },
        { name: 'timestamp', type: 'string' },
        { name: 'nonce', type: 'uint256' },
        { name: 'message', type: 'string' },
      ],
    },
  };
}
