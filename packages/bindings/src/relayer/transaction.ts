import { z } from 'zod';
import { EvmAddressSchema, TransactionIdSchema, TxHashSchema } from '../shared';

export enum RelayerTransactionType {
  SAFE = 'SAFE',
  PROXY = 'PROXY',
  SAFE_CREATE = 'SAFE-CREATE',
  WALLET = 'WALLET',
  WALLET_CREATE = 'WALLET-CREATE',
}

export const RelayerTransactionTypeSchema = z.enum(RelayerTransactionType);

const RelayerLegacyTransactionTypeSchema = z.enum([
  RelayerTransactionType.PROXY,
  RelayerTransactionType.SAFE,
  RelayerTransactionType.SAFE_CREATE,
]);

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

export const RelayerLegacyExecuteRequestSchema = z.object({
  data: z.string().min(1),
  from: EvmAddressSchema,
  metadata: z.string().optional(),
  nonce: z.string().min(1).optional(),
  proxyWallet: EvmAddressSchema,
  signature: z.string().min(1),
  signatureParams: RelayerSignatureParamsSchema,
  to: EvmAddressSchema,
  type: RelayerLegacyTransactionTypeSchema,
  value: z.string().optional(),
});

export type RelayerLegacyExecuteRequest = z.input<
  typeof RelayerLegacyExecuteRequestSchema
>;

export const DepositWalletCallSchema = z.object({
  data: z.string().min(1),
  target: EvmAddressSchema,
  value: z.string().min(1),
});

export type DepositWalletCall = z.input<typeof DepositWalletCallSchema>;

export const DepositWalletParamsSchema = z.object({
  calls: z.array(DepositWalletCallSchema).min(1),
  deadline: z.string().min(1),
  depositWallet: EvmAddressSchema,
});

export type DepositWalletParams = z.input<typeof DepositWalletParamsSchema>;

export const RelayerDepositWalletExecuteRequestSchema = z.object({
  depositWalletParams: DepositWalletParamsSchema,
  from: EvmAddressSchema,
  metadata: z.string().optional(),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  to: EvmAddressSchema,
  type: z.literal(RelayerTransactionType.WALLET),
});

export type RelayerDepositWalletExecuteRequest = z.input<
  typeof RelayerDepositWalletExecuteRequestSchema
>;

export const RelayerDepositWalletCreateRequestSchema = z.object({
  from: EvmAddressSchema,
  metadata: z.string().optional(),
  to: EvmAddressSchema,
  type: z.literal(RelayerTransactionType.WALLET_CREATE),
});

export type RelayerDepositWalletCreateRequest = z.input<
  typeof RelayerDepositWalletCreateRequestSchema
>;

export const RelayerExecuteRequestSchema = z.union([
  RelayerLegacyExecuteRequestSchema,
  RelayerDepositWalletExecuteRequestSchema,
  RelayerDepositWalletCreateRequestSchema,
]);

export type RelayerExecuteRequest = z.input<typeof RelayerExecuteRequestSchema>;

export const RelayerExecuteResponseSchema = z
  .object({
    state: RelayerTransactionStateSchema,
    transactionHash: TxHashSchema.nullish().transform((value) => value ?? null),
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
