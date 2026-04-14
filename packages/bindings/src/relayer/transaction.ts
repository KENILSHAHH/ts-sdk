import { z } from 'zod';
import { EvmAddressSchema, TransactionIdSchema, TxHashSchema } from '../shared';

export enum RelayerTransactionType {
  SAFE = 'SAFE',
  PROXY = 'PROXY',
  SAFE_CREATE = 'SAFE-CREATE',
}

const RelayerTransactionTypeSchema = z.enum(RelayerTransactionType);

export enum RelayerTransactionState {
  STATE_NEW = 'STATE_NEW',
  STATE_EXECUTED = 'STATE_EXECUTED',
  STATE_MINED = 'STATE_MINED',
  STATE_CONFIRMED = 'STATE_CONFIRMED',
  STATE_INVALID = 'STATE_INVALID',
  STATE_FAILED = 'STATE_FAILED',
}

const RelayerTransactionStateSchema = z.enum(RelayerTransactionState);

const RelayerSignatureParamsSchema = z.object({
  baseGas: z.string().optional(),
  gasLimit: z.string().optional(),
  gasPrice: z.string().optional(),
  gasToken: EvmAddressSchema.optional(),
  operation: z.string().optional(),
  payment: z.string().optional(),
  paymentReceiver: EvmAddressSchema.optional(),
  paymentToken: EvmAddressSchema.optional(),
  refundReceiver: EvmAddressSchema.optional(),
  relay: EvmAddressSchema.optional(),
  relayHub: EvmAddressSchema.optional(),
  relayerFee: z.string().optional(),
  safeTxnGas: z.string().optional(),
});

export const RelayerExecuteParamsSchema = z.object({
  address: EvmAddressSchema,
  nonce: z.string().min(1),
});

export type RelayerExecuteParams = z.output<typeof RelayerExecuteParamsSchema>;

export const RelayerExecuteRequestSchema = z.object({
  data: z.string().min(1),
  from: EvmAddressSchema,
  metadata: z.string().optional(),
  nonce: z.string().min(1).optional(),
  proxyWallet: EvmAddressSchema,
  signature: z.string().min(1),
  signatureParams: RelayerSignatureParamsSchema,
  to: EvmAddressSchema,
  type: RelayerTransactionTypeSchema,
  value: z.string().optional(),
});

export type RelayerExecuteRequest = z.input<typeof RelayerExecuteRequestSchema>;

export const RelayerExecuteResponseSchema = z
  .object({
    state: RelayerTransactionStateSchema,
    transactionHash: z
      .union([z.literal(''), TxHashSchema])
      .transform((value) => (value === '' ? null : value)),
    transactionID: TransactionIdSchema,
  })
  .transform(({ transactionHash, transactionID, ...rest }) => ({
    ...rest,
    transactionHash: transactionHash ?? null,
    transactionId: transactionID,
  }));

export type RelayerExecuteResponse = z.output<
  typeof RelayerExecuteResponseSchema
>;

export const RelayerDeployedResponseSchema = z.object({
  deployed: z.boolean(),
});

export type RelayerDeployedResponse = z.output<
  typeof RelayerDeployedResponseSchema
>;

export const GaslessTransactionSchema = z
  .object({
    error_msg: z.string().nullish(),
    state: RelayerTransactionStateSchema,
    transaction_hash: z
      .union([z.literal(''), TxHashSchema])
      .transform((value) => (value === '' ? null : value)),
    transaction_id: TransactionIdSchema,
  })
  .transform(({ error_msg, transaction_hash, transaction_id, ...rest }) => ({
    ...rest,
    errorMsg: error_msg ?? null,
    transactionHash: transaction_hash ?? null,
    transactionId: transaction_id,
  }));

export type GaslessTransaction = z.output<typeof GaslessTransactionSchema>;
