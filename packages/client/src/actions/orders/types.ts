import type {
  BuilderCode,
  OrderSide,
  OrderType,
  TokenId,
} from '@polymarket/bindings';
import type { OrderResponse, SignatureType } from '@polymarket/bindings/clob';
import type { EvmAddress, EvmSignature, HexString } from '@polymarket/types';
import type { TransactionHandle, TypedDataPayload } from '../../types';
import type { SignOrderRequest } from '../../workflow';
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

  /** Optional builder attribution code. */
  builderCode?: HexString;

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

  /** Optional builder attribution code. */
  builderCode?: HexString;

  /**
   * Posts the prepared order as post-only when submitted.
   *
   * @defaultValue false
   */
  postOnly?: boolean;

  /**
   * Unix timestamp in seconds after which the order expires.
   *
   * When provided, the SDK prepares a Good-Til-Date (GTD) limit order that
   * expires at the given timestamp.
   *
   * When omitted, the SDK prepares a Good-Til-Cancelled (GTC) limit order.
   */
  expiration?: number;
};

export type OrderDraft = {
  builderCode?: BuilderCode;
  chainId: number;
  exchangeAddress: EvmAddress;
  expiration: number;
  funderAddress: EvmAddress;
  offeredAmount: bigint;
  orderType: OrderType;
  side: OrderSide;
  signer: EvmAddress;
  requestedAmount: bigint;
  tokenId: TokenId;
};

/**
 * @internal
 */
export type UnsignedOrder = {
  chainId: number;
  builder: HexString;
  exchangeAddress: EvmAddress;
  expiration: number;
  maker: EvmAddress;
  makerAmount: string;
  metadata: HexString;
  orderType: OrderType;
  salt: string;
  side: OrderSide;
  signatureType: SignatureType;
  signer: EvmAddress;
  takerAmount: string;
  timestamp: string;
  tokenId: TokenId;
};

export type SignedOrder = {
  builder: HexString;
  expiration: number;
  maker: EvmAddress;
  makerAmount: string;
  metadata: HexString;
  orderType: OrderType;
  salt: string;
  side: OrderSide;
  signatureType: SignatureType;
  signer: EvmAddress;
  takerAmount: string;
  timestamp: string;
  tokenId: TokenId;
  signature: EvmSignature;
  postOnly?: boolean;
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

export type OrderPostingWorkflow = AsyncGenerator<
  OrderWorkflowRequest,
  OrderResponse,
  EvmAddress | EvmSignature | TransactionHandle
>;

/** @internal */
export function signOrder(payload: TypedDataPayload): SignOrderRequest {
  return {
    kind: 'signOrder',
    payload,
  };
}
