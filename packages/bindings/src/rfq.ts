import type {
  Erc1271Signature,
  EvmSignature,
  HexString,
} from '@polymarket/types';
import { z } from 'zod';
import { type SignatureType, SignatureTypeSchema } from './clob/signature-type';
import type { BaseUnits, EvmAddress, TokenId } from './shared';
import {
  ConditionIdSchema,
  EpochMicrosecondsSchema,
  EvmAddressSchema,
  type OrderSide,
  type PositionId,
  PositionIdSchema,
  type RfqId,
  RfqIdSchema,
  type RfqQuoteId,
  RfqQuoteIdSchema,
  RfqRequestorPublicIdSchema,
  TxHashSchema,
  toDecimalString,
} from './shared';

export type {
  RfqId,
  RfqQuoteId,
  RfqRequestorPublicId,
} from './shared';

export enum RfqDirection {
  Buy = 'BUY',
  Sell = 'SELL',
}

export enum RfqSide {
  Yes = 'YES',
  No = 'NO',
}

export enum RfqConfirmationDecision {
  Confirm = 'CONFIRM',
  Decline = 'DECLINE',
}

export enum RfqExecutionStatus {
  Matched = 'MATCHED',
  Mined = 'MINED',
  Confirmed = 'CONFIRMED',
  Retrying = 'RETRYING',
  Failed = 'FAILED',
}

export const RfqDirectionSchema = z.enum(RfqDirection);
export const RfqSideSchema = z.literal(RfqSide.Yes);
export const RfqConfirmationDecisionSchema = z.enum(RfqConfirmationDecision);
export const RfqExecutionStatusSchema = z.enum(RfqExecutionStatus);

const E6DecimalStringSchema = z.number().int().transform(toDecimalStringFromE6);

export type RfqSignedOrder = {
  salt: string;
  maker: EvmAddress;
  signer: EvmAddress;
  tokenId: PositionId | TokenId;
  makerAmount: BaseUnits;
  takerAmount: BaseUnits;
  side: RfqOrderSide;
  signatureType: SignatureType;
  timestamp: string;
  builder?: HexString;
  expiration?: string;
  metadata?: HexString;
  signature: EvmSignature | Erc1271Signature;
};

export type RfqOrderSide = OrderSide | 0 | 1;

export type RfqAuthMessage = {
  type: 'auth';
  auth: {
    apiKey: string;
    passphrase: string;
    secret: string;
  };
  identity: {
    signer_address: EvmAddress;
    maker_address: EvmAddress;
    signature_type: SignatureType;
  };
};

export const RfqAuthResponseMessageSchema = z.object({
  type: z.literal('auth'),
  success: z.boolean(),
  address: EvmAddressSchema.optional(),
  role: z.string().optional(),
  error: z.string().optional(),
});

export type RfqAuthResponseMessage = z.infer<
  typeof RfqAuthResponseMessageSchema
>;

export const RfqQuoteRequestSchema = z
  .object({
    type: z.literal('RFQ_REQUEST'),
    rfq_id: RfqIdSchema,
    requestor_public_id: RfqRequestorPublicIdSchema,
    leg_position_ids: z.array(PositionIdSchema),
    condition_id: ConditionIdSchema,
    yes_position_id: PositionIdSchema,
    no_position_id: PositionIdSchema,
    direction: RfqDirectionSchema,
    side: RfqSideSchema,
    size_e6: E6DecimalStringSchema,
    submission_deadline: EpochMicrosecondsSchema,
  })
  .transform((message) => ({
    conditionId: message.condition_id,
    direction: message.direction,
    legPositionIds: message.leg_position_ids,
    noPositionId: message.no_position_id,
    requestorPublicId: message.requestor_public_id,
    rfqId: message.rfq_id,
    side: message.side,
    size: message.size_e6,
    submissionDeadline: message.submission_deadline,
    type: 'quote_request' as const,
    yesPositionId: message.yes_position_id,
  }));

export type RfqQuoteRequest = z.infer<typeof RfqQuoteRequestSchema>;

export type RfqQuoteMessage = {
  type: 'RFQ_QUOTE';
  rfq_id: RfqId;
  price_e6: number;
  size_e6: number;
  signed_order: RfqSignedOrder;
};

export const RfqQuoteAckSchema = z
  .object({
    type: z.literal('ACK_RFQ_QUOTE'),
    rfq_id: RfqIdSchema,
    quote_id: RfqQuoteIdSchema,
  })
  .transform((message) => ({
    quoteId: message.quote_id,
    rfqId: message.rfq_id,
    type: 'quote_ack' as const,
  }));

export type RfqQuoteAck = z.infer<typeof RfqQuoteAckSchema>;

export const RfqConfirmationRequestSchema = z
  .object({
    type: z.literal('RFQ_CONFIRMATION_REQUEST'),
    rfq_id: RfqIdSchema,
    quote_id: RfqQuoteIdSchema,
    signer_address: EvmAddressSchema,
    maker_address: EvmAddressSchema,
    signature_type: SignatureTypeSchema,
    leg_position_ids: z.array(PositionIdSchema),
    condition_id: ConditionIdSchema,
    yes_position_id: PositionIdSchema,
    no_position_id: PositionIdSchema,
    direction: RfqDirectionSchema,
    side: RfqSideSchema,
    fill_size_e6: E6DecimalStringSchema,
    price_e6: E6DecimalStringSchema,
    confirm_by: EpochMicrosecondsSchema,
  })
  .transform((message) => ({
    conditionId: message.condition_id,
    confirmBy: message.confirm_by,
    direction: message.direction,
    fillSize: message.fill_size_e6,
    legPositionIds: message.leg_position_ids,
    makerAddress: message.maker_address,
    noPositionId: message.no_position_id,
    price: message.price_e6,
    quoteId: message.quote_id,
    rfqId: message.rfq_id,
    side: message.side,
    signatureType: message.signature_type,
    signerAddress: message.signer_address,
    type: 'confirmation_request' as const,
    yesPositionId: message.yes_position_id,
  }));

export type RfqConfirmationRequest = z.infer<
  typeof RfqConfirmationRequestSchema
>;

export type RfqConfirmationResponseMessage = {
  type: 'RFQ_CONFIRMATION_RESPONSE';
  rfq_id: RfqId;
  quote_id: RfqQuoteId;
  decision: RfqConfirmationDecision;
};

export const RfqConfirmationAckSchema = z
  .object({
    type: z.literal('ACK_RFQ_CONFIRMATION_RESPONSE'),
    rfq_id: RfqIdSchema,
    quote_id: RfqQuoteIdSchema,
    decision: RfqConfirmationDecisionSchema,
  })
  .transform((message) => ({
    decision: message.decision,
    quoteId: message.quote_id,
    rfqId: message.rfq_id,
    type: 'confirmation_ack' as const,
  }));

export type RfqConfirmationAck = z.infer<typeof RfqConfirmationAckSchema>;

export const RfqExecutionUpdateSchema = z
  .object({
    type: z.literal('RFQ_EXECUTION_UPDATE'),
    rfq_id: RfqIdSchema,
    status: RfqExecutionStatusSchema,
    tx_hash: TxHashSchema.optional(),
  })
  .transform((message) => ({
    rfqId: message.rfq_id,
    status: message.status,
    ...(message.tx_hash === undefined ? {} : { txHash: message.tx_hash }),
    type: 'execution_update' as const,
  }));

export type RfqExecutionUpdate = z.infer<typeof RfqExecutionUpdateSchema>;

export const RfqErrorMessageSchema = z.object({
  type: z.literal('error'),
  error: z.string(),
});

export type RfqErrorMessage = z.infer<typeof RfqErrorMessageSchema>;

export const RfqQuoterInboundMessageSchema = z.union([
  RfqAuthResponseMessageSchema,
  RfqQuoteRequestSchema,
  RfqQuoteAckSchema,
  RfqConfirmationRequestSchema,
  RfqConfirmationAckSchema,
  RfqExecutionUpdateSchema,
  RfqErrorMessageSchema,
]);

export type RfqQuoterInboundMessage = z.infer<
  typeof RfqQuoterInboundMessageSchema
>;

export type RfqQuoterOutboundMessage =
  | RfqQuoteMessage
  | RfqConfirmationResponseMessage;

function toDecimalStringFromE6(value: number) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Expected a safe integer, received: ${value}`);
  }
  if (value < 0) {
    throw new TypeError(`Expected a non-negative integer, received: ${value}`);
  }

  const whole = Math.floor(value / 1_000_000);
  const fraction = (value % 1_000_000).toString().padStart(6, '0');
  const trimmedFraction = fraction.replace(/0+$/, '');

  return toDecimalString(
    `${whole}${trimmedFraction === '' ? '' : `.${trimmedFraction}`}`,
  );
}
