import {
  type EvmAddress,
  type EvmSignature,
  expectEvmAddress,
  expectEvmSignature,
  expectTxHash,
  invariant,
  type TxHash,
} from '@polymarket/types';
import {
  type Account,
  type Chain,
  type Hash,
  hashTypedData,
  type SendTransactionParameters,
  type SendTransactionRequest,
  TransactionExecutionError,
  type Transport,
  UserRejectedRequestError,
  WaitForTransactionReceiptTimeoutError,
  type WalletClient,
} from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import type {
  Erc20ApprovalWorkflowRequest,
  Erc1155ApprovalForAllWorkflowRequest,
  TradingApprovalsWorkflowRequest,
} from '../actions/approvals';
import type { OrderWorkflow, SignedOrder } from '../actions/orders';
import type { AuthenticationWorkflow } from '../authentication';
import type { SecureClient } from '../clients';
import {
  CancelledSigningError,
  SigningError,
  TimeoutError,
  TransactionFailedError,
  TransportError,
} from '../errors';
import type { TransactionHandle } from '../types';

function isWalletClientWithAccount(
  walletClient: WalletClient,
): walletClient is WalletClient<Transport, Chain, Account> {
  return walletClient.account !== undefined;
}

export type AuthenticateWithError = CancelledSigningError | SigningError;

/**
 * Drives an authentication workflow with a viem wallet client.
 *
 * @throws {@link AuthenticateWithError}
 * Thrown when the required wallet signature is rejected or cannot be produced.
 */
export function authenticateWith(walletClient: WalletClient) {
  invariant(
    isWalletClientWithAccount(walletClient),
    'Wallet client with account is required',
  );

  const account = walletClient.account;
  const address = expectEvmAddress(
    typeof walletClient.account === 'string'
      ? walletClient.account
      : walletClient.account.address,
  );

  return async function authenticate(
    workflow: AuthenticationWorkflow,
  ): Promise<SecureClient> {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'requestAddress':
            result = await workflow.next(address);
            break;
          case 'signAuthMessage':
            result = await workflow.next(
              expectEvmSignature(
                await signTypedData(walletClient, {
                  account,
                  ...result.value.payload,
                }),
              ),
            );
            break;
        }
      } catch (error) {
        result = await workflow.throw(error);
      }
    }

    return result.value;
  };
}

export type ExecuteWithError = CancelledSigningError | SigningError;

/**
 * Drives an order workflow with a viem wallet client.
 *
 * @throws {@link ExecuteWithError}
 * Thrown when the required wallet signature is rejected or cannot be produced.
 */
export function executeWith(walletClient: WalletClient) {
  invariant(
    isWalletClientWithAccount(walletClient),
    'Wallet client with account is required',
  );

  const account = walletClient.account;

  return async function execute(workflow: OrderWorkflow): Promise<SignedOrder> {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'signOrder':
            result = await workflow.next(
              expectEvmSignature(
                await signTypedData(walletClient, {
                  account,
                  ...result.value.payload,
                }),
              ),
            );
            break;
        }
      } catch (error) {
        result = await workflow.throw(error);
      }
    }

    return result.value;
  };
}

export type ApproveWithError = CancelledSigningError | SigningError;

/**
 * Drives an approval workflow with a viem wallet client.
 *
 * @throws {@link ApproveWithError}
 * Thrown when the required wallet signature or submission is rejected or cannot be produced.
 */
export function approveWith(walletClient: WalletClient) {
  invariant(
    isWalletClientWithAccount(walletClient),
    'Wallet client with account is required',
  );

  const account = walletClient.account;
  const address = expectEvmAddress(
    typeof walletClient.account === 'string'
      ? walletClient.account
      : walletClient.account.address,
  );

  return async function approve(
    workflow: AsyncGenerator<
      | Erc20ApprovalWorkflowRequest
      | Erc1155ApprovalForAllWorkflowRequest
      | TradingApprovalsWorkflowRequest,
      TransactionHandle,
      EvmAddress | EvmSignature | TransactionHandle
    >,
  ): Promise<TransactionHandle> {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'sendErc20ApprovalTransaction':
          case 'sendErc1155ApprovalForAllTransaction': {
            const hash = await sendTransaction(walletClient, {
              account,
              ...result.value.request,
            });
            result = await workflow.next(
              new DirectTransactionHandle(hash, walletClient),
            );
            break;
          }

          case 'requestAddress':
            result = await workflow.next(address);
            break;

          case 'signGaslessTypedDataAsMessage':
            result = await workflow.next(
              expectEvmSignature(
                await signMessage(walletClient, {
                  account,
                  message: {
                    raw: hashTypedData(result.value.payload as never),
                  },
                }),
              ),
            );
            break;
        }
      } catch (error) {
        result = await workflow.throw(error);
      }
    }

    return result.value;
  };
}

async function sendTransaction<
  account extends Account,
  chain extends Chain,
  const request extends SendTransactionRequest<chain, chainOverride>,
  chainOverride extends Chain | undefined = undefined,
>(
  walletClient: WalletClient<Transport, chain, account>,
  request: SendTransactionParameters<chain, account, chainOverride, request>,
): Promise<TxHash> {
  try {
    const hash = await walletClient.sendTransaction(request);

    return expectTxHash(hash);
  } catch (error) {
    throwSigningWorkflowError(error);
  }
}

async function signTypedData<
  account extends Account,
  chain extends Chain,
  const request extends Parameters<
    WalletClient<Transport, chain, account>['signTypedData']
  >[0],
>(walletClient: WalletClient<Transport, chain, account>, request: request) {
  try {
    return await walletClient.signTypedData(request);
  } catch (error) {
    throwSigningWorkflowError(error);
  }
}

async function signMessage<
  account extends Account,
  chain extends Chain,
  const request extends Parameters<
    WalletClient<Transport, chain, account>['signMessage']
  >[0],
>(walletClient: WalletClient<Transport, chain, account>, request: request) {
  try {
    return await walletClient.signMessage(request);
  } catch (error) {
    throwSigningWorkflowError(error);
  }
}

function throwSigningWorkflowError(error: unknown): never {
  if (error instanceof UserRejectedRequestError) {
    throw CancelledSigningError.fromError(error);
  }

  if (error instanceof TransactionExecutionError) {
    const rejected = error.walk(
      (err) => err instanceof UserRejectedRequestError,
    );

    if (rejected) {
      throw CancelledSigningError.fromError(rejected);
    }
  }

  throw SigningError.fromError(error);
}

class DirectTransactionHandle implements TransactionHandle {
  readonly transactionId = null;

  #transactionHash: TxHash;
  readonly #walletClient: WalletClient;

  constructor(transactionHash: Hash, walletClient: WalletClient) {
    this.#transactionHash = expectTxHash(transactionHash);
    this.#walletClient = walletClient;
  }

  get transactionHash() {
    return this.#transactionHash;
  }

  async wait() {
    try {
      const receipt = await waitForTransactionReceipt(this.#walletClient, {
        hash: this.#transactionHash,
      });

      const transactionHash = expectTxHash(receipt.transactionHash);

      // viem's waitForTransactionReceipt supports transaction replacement
      // so it's important to use the transaction hash from the receipt
      this.#transactionHash = transactionHash;

      if (receipt.status === 'reverted') {
        throw new TransactionFailedError(
          `Transaction ${transactionHash} reverted`,
        );
      }

      return {
        transactionHash,
        transactionId: null,
      };
    } catch (error) {
      if (error instanceof WaitForTransactionReceiptTimeoutError) {
        throw new TimeoutError(
          `Timed out waiting for transaction ${this.#transactionHash} to settle`,
          { cause: error },
        );
      }

      throw TransportError.fromError(error);
    }
  }
}
