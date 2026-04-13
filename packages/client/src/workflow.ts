import type { EvmAddress } from '@polymarket/types';

export type RequestAddressRequest = {
  kind: 'requestAddress';
};

export type RequestAddressResult = EvmAddress;

export function requestAddress(): RequestAddressRequest {
  return {
    kind: 'requestAddress',
  };
}
