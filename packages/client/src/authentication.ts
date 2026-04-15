import type { EvmAddress } from '@polymarket/types';
import type { TypedDataPayload } from './types';

/** @internal */
export type CreateApiKeyAuthTypedDataPayloadRequest = {
  address: EvmAddress;
  chainId: number;
  nonce?: number;
  timestamp: number;
};

/** @internal */
export function createApiKeyAuthTypedDataPayload(
  request: CreateApiKeyAuthTypedDataPayloadRequest,
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
