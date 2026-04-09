import { SignatureType } from '@polymarket/bindings/clob';
import { WalletType } from '@polymarket/bindings/gamma';
import type { EvmAddress } from '@polymarket/types';

export type AccountIdentity = {
  signer: EvmAddress;
  wallet: EvmAddress;
  walletType: WalletType;
};

/** @internal */
export function toSignatureType(walletType: WalletType): SignatureType {
  switch (walletType) {
    case WalletType.EOA:
      return SignatureType.EOA;
    case WalletType.POLY_PROXY:
      return SignatureType.POLY_PROXY;
    case WalletType.POLY_GNOSIS_SAFE:
      return SignatureType.POLY_GNOSIS_SAFE;
  }
}
