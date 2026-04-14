import { EvmAddressSchema, TransactionIdSchema } from '@polymarket/bindings';
import { WalletType } from '@polymarket/bindings/gamma';
import {
  type GaslessTransaction,
  GaslessTransactionSchema,
  RelayerDeployedResponseSchema,
  type RelayerExecuteParams,
  RelayerExecuteParamsSchema,
  type RelayerExecuteRequest,
  RelayerExecuteRequestSchema,
  type RelayerExecuteResponse,
  RelayerExecuteResponseSchema,
  RelayerTransactionState,
  RelayerTransactionType,
} from '@polymarket/bindings/relayer';
import {
  delay,
  type EvmAddress,
  type EvmSignature,
  expectEvmAddress,
  expectEvmSignature,
  expectHexString,
  expectNonEmptyArray,
  type HexString,
  invariant,
  isHexString,
  type NonEmptyArray,
  unwrap,
  ZERO_ADDRESS,
} from '@polymarket/types';
import { z } from 'zod';
import { encodeSafeMultisendCall } from '../abis';
import { deriveSafeWalletAddress } from '../account';
import type { Client, SecureClient } from '../clients';
import {
  type RateLimitError,
  type RequestRejectedError,
  TimeoutError,
  TransactionFailedError,
  type TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import type {
  DeployTransactionHandle,
  TransactionCall,
  TransactionHandle,
  TransactionOutcome,
  TypedDataField,
  TypedDataPayload,
} from '../types';
import { type RequestAddressRequest, requestAddress } from '../workflow';

const EIP712_DOMAIN: readonly TypedDataField[] = [
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const SAFE_FACTORY_NAME = 'Polymarket Contract Proxy Factory';

const SAFE_CREATE: readonly TypedDataField[] = [
  { name: 'paymentToken', type: 'address' },
  { name: 'payment', type: 'uint256' },
  { name: 'paymentReceiver', type: 'address' },
];

const SAFE_TRANSACTION: readonly TypedDataField[] = [
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'data', type: 'bytes' },
  { name: 'operation', type: 'uint8' },
  { name: 'safeTxGas', type: 'uint256' },
  { name: 'baseGas', type: 'uint256' },
  { name: 'gasPrice', type: 'uint256' },
  { name: 'gasToken', type: 'address' },
  { name: 'refundReceiver', type: 'address' },
  { name: 'nonce', type: 'uint256' },
];

const FetchExecuteParamsRequestSchema = z.object({
  address: z.string(),
  type: z.enum(RelayerTransactionType),
});

export type FetchExecuteParamsRequest = z.input<
  typeof FetchExecuteParamsRequestSchema
>;

export type FetchExecuteParamsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the parameters needed to prepare a low-level transaction submission.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @throws {@link FetchExecuteParamsError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function fetchExecuteParams(
  client: Client,
  request: FetchExecuteParamsRequest,
): Promise<RelayerExecuteParams> {
  const params = parseUserInput(request, FetchExecuteParamsRequestSchema);

  return unwrap(
    client.relayer
      .get('/v1/account/transactions/params', {
        params: new URLSearchParams({
          address: params.address,
          type: params.type,
        }),
      })
      .andThen(validateWith(RelayerExecuteParamsSchema)),
  );
}

const FetchGaslessTransactionRequestSchema = z.object({
  transactionId: TransactionIdSchema,
});

export type FetchGaslessTransactionRequest = z.input<
  typeof FetchGaslessTransactionRequestSchema
>;

const IsGaslessReadyRequestSchema = z.object({
  wallet: EvmAddressSchema,
});

export type IsGaslessReadyRequest = z.input<typeof IsGaslessReadyRequestSchema>;

export type IsGaslessReadyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Checks whether a wallet is ready for gasless transactions.
 *
 * @throws {@link IsGaslessReadyError}
 * Thrown when the readiness check is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function isGaslessReady(
  client: Client,
  request: IsGaslessReadyRequest,
): Promise<boolean> {
  const params = parseUserInput(request, IsGaslessReadyRequestSchema);

  return unwrap(
    client.relayer
      .get('/deployed', {
        params: new URLSearchParams({
          address: params.wallet,
        }),
      })
      .andThen(validateWith(RelayerDeployedResponseSchema))
      .map(({ deployed }) => deployed),
  );
}

export type SignGaslessTypedDataRequest = {
  kind: 'signGaslessTypedData';
  payload: TypedDataPayload;
};

export type GaslessWalletWorkflowRequest =
  | RequestAddressRequest
  | SignGaslessTypedDataRequest;

export type GaslessWalletWorkflow = AsyncGenerator<
  GaslessWalletWorkflowRequest,
  DeployTransactionHandle,
  EvmAddress | EvmSignature
>;

export type PrepareGaslessWalletError =
  | ExecuteGaslessError
  | IsGaslessReadyError
  | UserInputError;

/**
 * Starts preparing the wallet for gasless transactions.
 *
 * @throws {@link PrepareGaslessWalletError}
 * Thrown when the wallet is already ready, cannot be prepared through this flow, or the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function prepareGaslessWallet(
  client: Client,
): Promise<GaslessWalletWorkflow> {
  invariant(
    client.supportsGasless,
    'Client does not support gasless transactions',
  );

  return async function* (): GaslessWalletWorkflow {
    const signer = expectEvmAddress(yield requestAddress());

    const safeWallet = deriveSafeWalletAddress(
      signer,
      client.environment.walletDerivation,
    );

    if (await isGaslessReady(client, { wallet: safeWallet })) {
      throw new UserInputError(
        'Wallet is already ready for gasless transactions',
      );
    }

    if (client.isSecureClient()) {
      invariant(
        signer === client.account.signer,
        'Wallet client address does not match the authenticated signer',
      );
    }

    const signature = expectEvmSignature(
      yield signGaslessTypedData(
        createSafeCreateTypedDataPayload({
          chainId: client.environment.chainId,
          safeFactory: client.environment.walletDerivation.safeFactory,
        }),
      ),
    );

    const handle = await executeGasless(client, {
      data: '0x',
      from: signer,
      proxyWallet: safeWallet,
      signature,
      signatureParams: {
        payment: '0',
        paymentReceiver: ZERO_ADDRESS,
        paymentToken: ZERO_ADDRESS,
      },
      to: client.environment.walletDerivation.safeFactory,
      type: RelayerTransactionType.SAFE_CREATE,
    });

    return new GaslessWalletHandle(safeWallet, handle);
  }.call(null);
}

/**
 * Fetches a submitted transaction.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @throws {@link FetchGaslessTransactionError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function fetchTransaction(
  client: Client,
  request: FetchGaslessTransactionRequest,
): Promise<GaslessTransaction> {
  const params = parseUserInput(request, FetchGaslessTransactionRequestSchema);

  return unwrap(
    client.relayer
      .get(`/v1/account/transactions/${params.transactionId}`)
      .andThen(validateWith(GaslessTransactionSchema)),
  );
}

const TransactionCallSchema = z.object({
  data: z.custom<HexString>(isHexString),
  to: EvmAddressSchema,
  value: z.bigint().optional(),
});

export const GaslessTransactionMetadataSchema = z.string().max(500);

const PrepareGaslessTransactionRequestSchema = z.object({
  calls: z
    .array(TransactionCallSchema)
    .min(1)
    .transform((val) => expectNonEmptyArray(val)),
  metadata: GaslessTransactionMetadataSchema.optional(),
});

export type PrepareGaslessTransactionRequest = z.input<
  typeof PrepareGaslessTransactionRequestSchema
>;

export type SignGaslessMessageRequest = {
  kind: 'signGaslessMessage';
  payload: TypedDataPayload;
};

export type GaslessWorkflowRequest =
  | RequestAddressRequest
  | SignGaslessMessageRequest;

export type GaslessWorkflow = AsyncGenerator<
  GaslessWorkflowRequest,
  TransactionHandle,
  EvmAddress | EvmSignature
>;

export type PrepareGaslessTransactionError =
  | ExecuteGaslessError
  | FetchExecuteParamsError
  | UserInputError;

/**
 * Starts preparing a low-level transaction workflow from one or more calls.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @throws {@link PrepareGaslessTransactionError}
 * Thrown when the request is invalid, unsupported for the current account, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function prepareGaslessTransaction(
  client: SecureClient,
  request: PrepareGaslessTransactionRequest,
): Promise<GaslessWorkflow> {
  const params = parseUserInput(
    request,
    PrepareGaslessTransactionRequestSchema,
  );

  invariant(
    client.supportsGasless,
    'Client does not support gasless transactions',
  );
  invariant(
    client.account.walletType === WalletType.POLY_GNOSIS_SAFE,
    'Gasless transaction preparation currently supports Safe-backed accounts only',
  );

  return async function* (): GaslessWorkflow {
    const signer = expectEvmAddress(yield requestAddress());

    invariant(
      signer === client.account.signer,
      'Wallet client address does not match the authenticated signer',
    );

    const executeParams = await fetchExecuteParams(client, {
      address: client.account.signer,
      type: RelayerTransactionType.SAFE,
    });
    const transaction = aggregateSafeTransactionCalls(
      params.calls,
      client.environment.safeMultisend,
    );

    const signature = expectEvmSignature(
      yield signGaslessTypedDataAsMessage(
        createSafeTypedDataPayload({
          chainId: client.environment.chainId,
          data: transaction.data,
          nonce: executeParams.nonce,
          operation: transaction.operation,
          safeAddress: client.account.wallet,
          to: transaction.to,
          value: transaction.value,
        }),
      ),
    );

    return executeGasless(client, {
      data: transaction.data,
      from: client.account.signer,
      metadata: params.metadata,
      nonce: executeParams.nonce,
      proxyWallet: client.account.wallet,
      signature: packSafeSignature(signature),
      signatureParams: createSafeSignatureParams(transaction.operation),
      to: transaction.to,
      type: RelayerTransactionType.SAFE,
      value: transaction.value > 0n ? `${transaction.value}` : undefined,
    });
  }.call(null);
}

type ExecuteGaslessRequest = RelayerExecuteRequest;

type ExecuteGaslessError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

async function executeGasless(
  client: Client,
  request: ExecuteGaslessRequest,
): Promise<GaslessTransactionHandle> {
  const payload = parseUserInput(request, RelayerExecuteRequestSchema);

  const response = await unwrap(
    client.relayer
      .post('/submit', {
        json: payload,
      })
      .andThen(validateWith(RelayerExecuteResponseSchema)),
  );

  return new GaslessTransactionHandle(client, response);
}

type SafeTransaction = {
  data: HexString;
  operation: 0 | 1;
  to: EvmAddress;
  value: bigint;
};

type CreateSafeTypedDataPayloadRequest = {
  chainId: number;
  data: HexString;
  nonce: string;
  operation: 0 | 1;
  safeAddress: EvmAddress;
  to: EvmAddress;
  value: bigint;
};

function aggregateSafeTransactionCalls(
  calls: NonEmptyArray<TransactionCall>,
  safeMultisend: EvmAddress,
): SafeTransaction {
  if (calls.length === 1) {
    const [call] = calls;

    return {
      data: call.data,
      operation: 0,
      to: call.to,
      value: call.value ?? 0n,
    };
  }

  return {
    data: encodeSafeMultisendCall(calls),
    operation: 1,
    to: safeMultisend,
    value: 0n,
  };
}

function createSafeSignatureParams(operation: 0 | 1) {
  return {
    baseGas: '0',
    gasPrice: '0',
    gasToken: ZERO_ADDRESS,
    operation: `${operation}`,
    refundReceiver: ZERO_ADDRESS,
    safeTxnGas: '0',
  };
}

function createSafeTypedDataPayload(
  request: CreateSafeTypedDataPayloadRequest,
): TypedDataPayload {
  return {
    domain: {
      chainId: request.chainId,
      verifyingContract: request.safeAddress,
    },
    message: {
      baseGas: 0n,
      data: request.data,
      gasPrice: 0n,
      gasToken: ZERO_ADDRESS,
      nonce: BigInt(request.nonce),
      operation: request.operation,
      refundReceiver: ZERO_ADDRESS,
      safeTxGas: 0n,
      to: request.to,
      value: request.value,
    },
    primaryType: 'SafeTx',
    types: {
      EIP712Domain: EIP712_DOMAIN,
      SafeTx: SAFE_TRANSACTION,
    },
  };
}

type CreateSafeCreateTypedDataPayloadRequest = {
  chainId: number;
  safeFactory: EvmAddress;
};

function createSafeCreateTypedDataPayload(
  request: CreateSafeCreateTypedDataPayloadRequest,
): TypedDataPayload {
  return {
    domain: {
      chainId: request.chainId,
      name: SAFE_FACTORY_NAME,
      verifyingContract: request.safeFactory,
    },
    message: {
      payment: 0n,
      paymentReceiver: ZERO_ADDRESS,
      paymentToken: ZERO_ADDRESS,
    },
    primaryType: 'CreateProxy',
    types: {
      CreateProxy: SAFE_CREATE,
    },
  };
}

function signGaslessTypedData(
  payload: TypedDataPayload,
): SignGaslessTypedDataRequest {
  return {
    kind: 'signGaslessTypedData',
    payload,
  };
}

function signGaslessTypedDataAsMessage(
  payload: TypedDataPayload,
): SignGaslessMessageRequest {
  return {
    kind: 'signGaslessMessage',
    payload,
  };
}

function packSafeSignature(signature: EvmSignature): HexString {
  const prefixlessSignature = signature.slice(2);
  const v = Number.parseInt(prefixlessSignature.slice(128, 130), 16);

  const packedV =
    v === 0 || v === 1 ? v + 31 : v === 27 || v === 28 ? v + 4 : v;

  return expectHexString(
    `0x${prefixlessSignature.slice(0, 128)}${packedV.toString(16).padStart(2, '0')}`,
  );
}

export type WaitForGaslessTransactionError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError
  | TimeoutError
  | TransactionFailedError;

class GaslessTransactionHandle implements TransactionHandle {
  readonly #client: Client;

  readonly transactionHash;
  readonly transactionId;

  constructor(client: Client, response: RelayerExecuteResponse) {
    this.#client = client;
    this.transactionHash = response.transactionHash;
    this.transactionId = response.transactionId;
  }

  async wait(): Promise<TransactionOutcome> {
    let pollCount = 0;

    while (pollCount < this.#client.environment.relayerMaxPolls) {
      const transaction = await fetchTransaction(this.#client, {
        transactionId: this.transactionId,
      });

      if (
        transaction.state === RelayerTransactionState.STATE_MINED ||
        transaction.state === RelayerTransactionState.STATE_CONFIRMED
      ) {
        const transactionHash =
          transaction.transactionHash ?? this.transactionHash;

        if (transactionHash === null) {
          throw new UnexpectedResponseError(
            'Expected submitted transaction to have a transaction hash once settled',
          );
        }

        return {
          transactionHash,
          transactionId: transaction.transactionId,
        };
      }

      if (
        transaction.state === RelayerTransactionState.STATE_FAILED ||
        transaction.state === RelayerTransactionState.STATE_INVALID
      ) {
        throw new TransactionFailedError(
          transaction.errorMsg ??
            `Transaction ${transaction.transactionId} reached terminal state ${transaction.state}`,
        );
      }

      pollCount += 1;
      await delay(this.#client.environment.relayerPollFrequencyMs);
    }

    throw new TimeoutError(
      `Timed out waiting for transaction ${this.transactionId} to settle`,
    );
  }
}

class GaslessWalletHandle implements DeployTransactionHandle {
  readonly #wallet: EvmAddress;
  readonly #transaction: TransactionHandle;

  constructor(wallet: EvmAddress, transaction: TransactionHandle) {
    this.#wallet = wallet;
    this.#transaction = transaction;
  }

  get wallet() {
    return this.#wallet;
  }

  get transactionHash() {
    return this.#transaction.transactionHash;
  }

  get transactionId() {
    return this.#transaction.transactionId;
  }

  wait() {
    return this.#transaction.wait();
  }
}
