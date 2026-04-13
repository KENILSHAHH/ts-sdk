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
  type Transport,
  type WalletClient,
} from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import type { Erc20ApprovalWorkflowRequest } from '../actions/approvals';
import type { OrderWorkflow, SignedOrder } from '../actions/orders';
import type { AuthenticationWorkflow } from '../authentication';
import type { SecureClient } from '../clients';
import {
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
                await walletClient.signTypedData({
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
                await walletClient.signTypedData({
                  account,
                  ...result.value.payload,
                }),
              ),
            );
            break;

          case 'sendTransaction':
            result = await workflow.next(
              (await walletClient.sendTransaction({
                account,
                ...result.value.request,
              })) as TxHash,
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
      Erc20ApprovalWorkflowRequest,
      TransactionHandle,
      EvmAddress | EvmSignature | TransactionHandle
    >,
  ): Promise<TransactionHandle> {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'sendErc20ApprovalTransaction': {
            const hash = await walletClient.sendTransaction({
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
                await walletClient.signMessage({
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
      if (
        error instanceof Error &&
        error.name === 'WaitForTransactionReceiptTimeoutError'
      ) {
        throw new TimeoutError(
          `Timed out waiting for transaction ${this.#transactionHash} to settle`,
          { cause: error },
        );
      }

      throw TransportError.fromError(error);
    }
  }
}
