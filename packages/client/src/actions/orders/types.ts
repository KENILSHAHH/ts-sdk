import type { TokenId } from '@polymarket/bindings';
import type {
  OrderSide,
  OrderType,
  SignatureType,
} from '@polymarket/bindings/clob';
import type { EvmAddress, EvmSignature } from '@polymarket/types';
import type { TransactionHandle, TypedDataPayload } from '../../types';
import type {
  Erc20ApprovalWorkflowRequest,
  Erc1155ApprovalForAllWorkflowRequest,
} from '../approvals';

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

export type PrepareLimitOrderRequest = {
  /** TokenID of the Conditional token asset being traded */
  tokenId: string;

  /** Price used to create the order */
  price: number;

  /** Size in terms of the conditional token */
  size: number;

  /** Side of the order */
  side: OrderSide;

  /** Taker address. Omit for public orders (zero address is equivalent). */
  taker?: string;

  /** Timestamp after which the order is expired. Required for GTD orders. */
  expiration?: number;

  /**
   * Specifies the type of order execution.
   * - GTC (Good-Til-Cancelled): rests on the book until filled or cancelled
   * - GTD (Good-Til-Date): active until the specified expiration timestamp
   *
   * @defaultValue OrderType.GTC
   */
  orderType?: OrderType.GTC | OrderType.GTD;
};

export type OrderDraft = {
  chainId: number;
  exchangeAddress: EvmAddress;
  expiration: number;
  feeRateBps: number;
  funderAddress: EvmAddress;
  offeredAmount: bigint;
  orderType: OrderType;
  side: OrderSide;
  signer: EvmAddress;
  allowedTaker?: EvmAddress;
  requestedAmount: bigint;
  tokenId: TokenId;
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
  tokenId: TokenId;
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
  tokenId: TokenId;
  signature: EvmSignature;
};

export type SignOrderRequest = {
  kind: 'signOrder';
  payload: TypedDataPayload;
};

export type OrderWorkflowRequest =
  | Erc20ApprovalWorkflowRequest
  | Erc1155ApprovalForAllWorkflowRequest
  | SignOrderRequest;

export type OrderWorkflow = AsyncGenerator<
  OrderWorkflowRequest,
  SignedOrder,
  EvmAddress | EvmSignature | TransactionHandle
>;

/** @internal */
export function signOrder(payload: TypedDataPayload): SignOrderRequest {
  return {
    kind: 'signOrder',
    payload,
  };
}
