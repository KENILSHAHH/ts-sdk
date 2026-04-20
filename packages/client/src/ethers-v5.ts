import {
  expectEvmAddress,
  expectEvmSignature,
  expectTxHash,
  type HexString,
  type TxHash,
} from '@polymarket/types';
import { ethers } from 'ethers-v5';
import {
  CancelledSigningError,
  SigningError,
  TransactionFailedError,
  TransportError,
} from './errors';
import type { TransactionHandle, TypedData, TypedDataPayload } from './types';
import type { AuthenticateWith, CompleteWith } from './workflow';

type EthersV5Signer = ethers.Signer & {
  _signTypedData(
    domain: TypedDataPayload['domain'],
    types: ReturnType<typeof removeEip712Domain>,
    value: TypedDataPayload['message'],
  ): Promise<string>;
};

/**
 * Drives an authentication workflow with an ethers v5 signer.
 *
 * @throws {@link AuthenticateWithError}
 * Thrown when the required wallet signature is rejected or cannot be produced.
 */
export function authenticateWith(signer: EthersV5Signer): AuthenticateWith {
  return async function authenticate(workflow) {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'requestAddress': {
            const address = await getAddress(signer);
            result = await workflow.next(address);
            break;
          }
          case 'signAuthMessage':
            result = await workflow.next(
              await signTypedData(signer, result.value.payload),
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

/**
 * Drives a workflow with an ethers v5 signer.
 *
 * Supports the current non-auth workflow set, including order signing,
 * approvals, transfers, redemptions, and gasless wallet preparation.
 *
 * @throws {@link CompleteWithError}
 * Thrown when the required wallet signature or submission is rejected or cannot be produced.
 */
export function completeWith(signer: EthersV5Signer): CompleteWith {
  return async function complete(workflow) {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'sendErc20ApprovalTransaction':
          case 'sendErc1155ApprovalForAllTransaction':
          case 'sendErc20TransferTransaction':
          case 'sendMergePositionsTransaction':
          case 'sendRedeemPositionsTransaction':
          case 'sendSplitPositionTransaction': {
            const response = await sendTransaction(
              signer,
              result.value.request,
            );
            result = await workflow.next(new DirectTransactionHandle(response));
            break;
          }

          case 'requestAddress': {
            const address = await getAddress(signer);
            result = await workflow.next(address);
            break;
          }

          case 'signGaslessTypedData':
          case 'signOrder':
            result = await workflow.next(
              await signTypedData(signer, result.value.payload),
            );
            break;

          case 'signGaslessMessage':
            result = await workflow.next(
              await signMessage(signer, result.value.payload),
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

async function getAddress(signer: EthersV5Signer) {
  try {
    return expectEvmAddress(await signer.getAddress());
  } catch (error) {
    throw SigningError.fromError(error, 'Could not resolve signer address');
  }
}

async function sendTransaction(
  signer: EthersV5Signer,
  request: { chainId: number; data?: HexString; to: string; value?: bigint },
): Promise<ethers.providers.TransactionResponse> {
  try {
    return await signer.sendTransaction({
      chainId: request.chainId,
      data: request.data,
      to: request.to,
      value: request.value?.toString(),
    });
  } catch (error) {
    throwSigningWorkflowError(error);
  }
}

async function signTypedData(
  signer: EthersV5Signer,
  payload: TypedDataPayload,
) {
  try {
    return expectEvmSignature(
      await signer._signTypedData(
        payload.domain,
        removeEip712Domain(payload.types),
        payload.message,
      ),
    );
  } catch (error) {
    throwSigningWorkflowError(error);
  }
}

async function signMessage(signer: EthersV5Signer, payload: TypedDataPayload) {
  try {
    const digest = ethers.utils._TypedDataEncoder.hash(
      payload.domain,
      removeEip712Domain(payload.types),
      payload.message,
    );

    return expectEvmSignature(
      await signer.signMessage(ethers.utils.arrayify(digest)),
    );
  } catch (error) {
    throwSigningWorkflowError(error);
  }
}

function removeEip712Domain(
  types: TypedData,
): Record<string, Array<{ name: string; type: string }>> {
  const entries = Object.entries(types).filter(
    ([name]) => name !== 'EIP712Domain',
  );

  return Object.fromEntries(
    entries.map(([name, fields]) => [
      name,
      fields.map((field) => ({ ...field })),
    ]),
  );
}

function throwSigningWorkflowError(error: unknown): never {
  if (isUserRejectedError(error)) {
    throw new CancelledSigningError('User rejected the signing request', {
      cause: error,
    });
  }

  throw SigningError.fromError(error);
}

function isUserRejectedError(
  error: unknown,
  seen = new Set<unknown>(),
): boolean {
  if (seen.has(error) || error === null || typeof error !== 'object') {
    return false;
  }

  seen.add(error);

  const candidate = error as {
    cause?: unknown;
    code?: unknown;
    error?: unknown;
  };

  return (
    // ethers v5 normalizes user-rejected wallet actions to ACTION_REJECTED,
    // but some provider-shaped errors can still surface the raw EIP-1193 4001.
    candidate.code === 4001 ||
    candidate.code === 'ACTION_REJECTED' ||
    isUserRejectedError(candidate.error, seen) ||
    isUserRejectedError(candidate.cause, seen)
  );
}

function isCallExceptionError(error: unknown): error is Error {
  return hasErrorCode(error, 'CALL_EXCEPTION');
}

function isTransactionReplacedError(error: unknown): error is Error & {
  cancelled: boolean;
  receipt: { transactionHash: string };
} {
  return hasErrorCode(error, 'TRANSACTION_REPLACED');
}

function hasErrorCode(error: unknown, code: string): error is Error {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

class DirectTransactionHandle implements TransactionHandle {
  readonly transactionId = null;
  #transactionHash: TxHash;
  readonly #transaction: ethers.providers.TransactionResponse;

  constructor(transaction: ethers.providers.TransactionResponse) {
    this.#transaction = transaction;
    this.#transactionHash = expectTxHash(transaction.hash);
  }

  get transactionHash() {
    return this.#transactionHash;
  }

  async wait() {
    try {
      const receipt = await this.#transaction.wait();

      const transactionHash = expectTxHash(receipt.transactionHash);
      this.#transactionHash = transactionHash;

      return {
        transactionHash,
        transactionId: null,
      };
    } catch (error) {
      if (isTransactionReplacedError(error)) {
        if (error.cancelled) {
          throw TransportError.fromError(error);
        }

        const transactionHash = expectTxHash(error.receipt.transactionHash);
        this.#transactionHash = transactionHash;

        return {
          transactionHash,
          transactionId: null,
        };
      }

      if (isCallExceptionError(error)) {
        throw new TransactionFailedError(
          `Transaction ${this.#transactionHash} reverted`,
          { cause: error },
        );
      }

      throw TransportError.fromError(error);
    }
  }
}
