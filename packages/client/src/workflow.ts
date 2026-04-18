import type { EvmAddress, EvmSignature, HexString } from '@polymarket/types';
import type { CancelledSigningError, SigningError } from './errors';
import type { TransactionHandle, TypedDataPayload } from './types';

export type SignerTransactionRequest = {
  data?: HexString;
  to: EvmAddress;
  value?: bigint;
};

export type RequestAddressRequest = {
  kind: 'requestAddress';
};

export type SignAuthMessageRequest = {
  kind: 'signAuthMessage';
  payload: TypedDataPayload;
};

export type SendErc20ApprovalTransactionRequest = {
  kind: 'sendErc20ApprovalTransaction';
  request: SignerTransactionRequest;
};

export type SendErc1155ApprovalForAllTransactionRequest = {
  kind: 'sendErc1155ApprovalForAllTransaction';
  request: SignerTransactionRequest;
};

export type SendErc20TransferTransactionRequest = {
  kind: 'sendErc20TransferTransaction';
  request: SignerTransactionRequest;
};

export type SignGaslessTypedDataRequest = {
  kind: 'signGaslessTypedData';
  payload: TypedDataPayload;
};

export type SignGaslessMessageRequest = {
  kind: 'signGaslessMessage';
  payload: TypedDataPayload;
};

export type SendSplitPositionTransactionRequest = {
  kind: 'sendSplitPositionTransaction';
  request: SignerTransactionRequest;
};

export type SendMergePositionsTransactionRequest = {
  kind: 'sendMergePositionsTransaction';
  request: SignerTransactionRequest;
};

export type SendRedeemPositionsTransactionRequest = {
  kind: 'sendRedeemPositionsTransaction';
  request: SignerTransactionRequest;
};

export type SignOrderRequest = {
  kind: 'signOrder';
  payload: TypedDataPayload;
};

export type AuthenticationWorkflowRequest =
  | RequestAddressRequest
  | SignAuthMessageRequest;

export type AuthenticationWorkflow<TReturn> = AsyncGenerator<
  AuthenticationWorkflowRequest,
  TReturn,
  EvmAddress | EvmSignature
>;

export type AuthenticateWith = <TReturn>(
  workflow: AuthenticationWorkflow<TReturn>,
) => Promise<TReturn>;

export type AuthenticateWithError = CancelledSigningError | SigningError;
export type CompleteWithError = CancelledSigningError | SigningError;

export type CompleteWorkflowRequest =
  | RequestAddressRequest
  | SendErc20ApprovalTransactionRequest
  | SendErc1155ApprovalForAllTransactionRequest
  | SendErc20TransferTransactionRequest
  | SignGaslessTypedDataRequest
  | SignGaslessMessageRequest
  | SendSplitPositionTransactionRequest
  | SendMergePositionsTransactionRequest
  | SendRedeemPositionsTransactionRequest
  | SignOrderRequest;

export type CompleteWorkflowNext =
  | EvmAddress
  | EvmSignature
  | TransactionHandle;

export type CompleteWith = <TRequest extends CompleteWorkflowRequest, TReturn>(
  workflow: AsyncGenerator<TRequest, TReturn, CompleteWorkflowNext>,
) => Promise<TReturn>;

export function requestAddress(): RequestAddressRequest {
  return {
    kind: 'requestAddress',
  };
}
