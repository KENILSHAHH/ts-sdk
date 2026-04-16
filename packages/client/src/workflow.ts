import type { EvmAddress, EvmSignature } from '@polymarket/types';
import type {
  Erc20ApprovalWorkflowRequest,
  Erc1155ApprovalForAllWorkflowRequest,
  TradingApprovalsWorkflowRequest,
} from './actions/approvals';
import type { GaslessWalletWorkflowRequest } from './actions/gasless';
import type { OrderWorkflowRequest } from './actions/orders';
import type {
  MergePositionsWorkflowRequest,
  RedeemPositionsWorkflowRequest,
  SplitPositionWorkflowRequest,
} from './actions/positions';
import type { Erc20TransferWorkflowRequest } from './actions/transfers';
import type { SecureClient } from './clients';
import type { CancelledSigningError, SigningError } from './errors';
import type { TransactionHandle, TypedDataPayload } from './types';

export type RequestAddressRequest = {
  kind: 'requestAddress';
};

export type AuthenticationWorkflowRequest =
  | RequestAddressRequest
  | {
      kind: 'signAuthMessage';
      payload: TypedDataPayload;
    };

export type AuthenticationWorkflow = AsyncGenerator<
  AuthenticationWorkflowRequest,
  SecureClient,
  EvmAddress | EvmSignature
>;

export type AuthenticateWithError = CancelledSigningError | SigningError;
export type CompleteWithError = CancelledSigningError | SigningError;

export type CompleteWorkflowRequest =
  | Erc20ApprovalWorkflowRequest
  | Erc1155ApprovalForAllWorkflowRequest
  | Erc20TransferWorkflowRequest
  | GaslessWalletWorkflowRequest
  | MergePositionsWorkflowRequest
  | TradingApprovalsWorkflowRequest
  | RedeemPositionsWorkflowRequest
  | SplitPositionWorkflowRequest
  | OrderWorkflowRequest;

export type CompleteWorkflowNext =
  | EvmAddress
  | EvmSignature
  | TransactionHandle;

export function requestAddress(): RequestAddressRequest {
  return {
    kind: 'requestAddress',
  };
}
