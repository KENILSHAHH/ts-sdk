import type {
  OrderSide,
  OrderType,
  SignatureType,
} from '@polymarket/bindings/clob';
import type {
  EvmAddress,
  HexString,
  Signature,
  TxHash,
} from '@polymarket/types';
import type { TypedDataPayload } from '../../types';

export type PrepareMarketOrderRequest = {
  /** TokenID of the Conditional token asset being traded */
  tokenId: string;

  /**
   * BUY orders: dollar amount to spend
   * SELL orders: number of shares to sell
   */
  amount: number;

  /** Side of the order */
  side: OrderSide;

  /** Taker address. Omit for public orders (zero address is equivalent). */
  taker?: string;

  /**
   * Specifies the type of order execution.
   * - FOK (Fill or Kill): must be filled entirely or not at all
   * - FAK (Fill and Kill): partially fills, cancels any unfilled remainder
   *
   * @defaultValue OrderType.FAK
   */
  orderType?: OrderType.FAK | OrderType.FOK;
};

/**
 * @internal
 */
export type UnsignedOrder = {
  chainId: number;
  exchangeAddress: EvmAddress;
  expiration: number;
  feeRateBps: number;
  maker: EvmAddress;
  makerAmount: string;
  nonce: number;
  orderType: OrderType;
  salt: string;
  side: OrderSide;
  signatureType: SignatureType;
  signer: EvmAddress;
  taker: EvmAddress;
  takerAmount: string;
  tokenId: string;
};

export type SignedOrder = {
  expiration: number;
  feeRateBps: number;
  maker: EvmAddress;
  makerAmount: string;
  nonce: number;
  orderType: OrderType;
  salt: string;
  side: OrderSide;
  signatureType: SignatureType;
  signer: EvmAddress;
  taker: EvmAddress;
  takerAmount: string;
  tokenId: string;
  signature: Signature;
};

export type OrderWorkflowRequest =
  | {
      kind: 'sendTransaction';
      request: {
        data?: HexString;
        to: EvmAddress;
        value?: bigint;
      };
    }
  | {
      kind: 'signOrder';
      payload: TypedDataPayload;
    };

export type OrderWorkflow = AsyncGenerator<
  OrderWorkflowRequest,
  SignedOrder,
  Signature | TxHash
>;
