import { describe, expect, it } from 'vitest';
import { SignatureType } from './clob/signature-type';
import {
  RfqConfirmationDecision,
  RfqErrorCode,
  RfqExecutionStatus,
  RfqQuoterInboundMessageSchema,
} from './rfq';

const conditionId =
  '0x032def24bfb0c5c57fb236fac08b94236a000000000000000000000000000000';
const signerAddress = '0x1111111111111111111111111111111111111111';
const makerAddress = '0x2222222222222222222222222222222222222222';
const txHash =
  '0x1111111111111111111111111111111111111111111111111111111111111111';

const quoteRequestFrame = {
  condition_id: conditionId,
  direction: 'BUY',
  leg_position_ids: ['1', '2'],
  no_position_id: '456',
  requestor_public_id: 'requestor-1',
  requested_size: {
    unit: 'notional',
    value_e6: '1000000',
  },
  rfq_id: 'rfq-1',
  side: 'YES',
  submission_deadline: 123,
  type: 'RFQ_REQUEST',
  yes_position_id: '123',
};

describe('RfqQuoterInboundMessageSchema', () => {
  it('parses all known inbound message variants', () => {
    const frames = [
      {
        address: signerAddress,
        role: 'maker',
        success: true,
        type: 'auth',
      },
      quoteRequestFrame,
      {
        quote_id: 'quote-1',
        rfq_id: 'rfq-1',
        type: 'ACK_RFQ_QUOTE',
      },
      {
        quote_id: 'quote-1',
        rfq_id: 'rfq-1',
        type: 'ACK_RFQ_QUOTE_CANCEL',
      },
      {
        ...quoteRequestFrame,
        confirm_by: 456,
        fill_size_e6: '1000000',
        maker_address: makerAddress,
        price_e6: '500000',
        quote_id: 'quote-1',
        signature_type: SignatureType.EOA,
        signer_address: signerAddress,
        type: 'RFQ_CONFIRMATION_REQUEST',
      },
      {
        decision: RfqConfirmationDecision.Confirm,
        quote_id: 'quote-1',
        rfq_id: 'rfq-1',
        type: 'ACK_RFQ_CONFIRMATION_RESPONSE',
      },
      {
        rfq_id: 'rfq-1',
        status: RfqExecutionStatus.Confirmed,
        tx_hash: txHash,
        type: 'RFQ_EXECUTION_UPDATE',
      },
      {
        code: RfqErrorCode.InvalidQuote,
        error: 'Invalid quote.',
        quote_id: 'quote-1',
        request_type: 'RFQ_QUOTE',
        rfq_id: 'rfq-1',
        type: 'RFQ_ERROR',
      },
    ];

    expect(
      frames.map((frame) => RfqQuoterInboundMessageSchema.parse(frame)),
    ).toEqual([
      expect.objectContaining({ type: 'auth' }),
      expect.objectContaining({ type: 'quote_request' }),
      expect.objectContaining({ type: 'quote_ack' }),
      expect.objectContaining({ type: 'quote_cancel_ack' }),
      expect.objectContaining({ type: 'confirmation_request' }),
      expect.objectContaining({ type: 'confirmation_ack' }),
      expect.objectContaining({ type: 'execution_update' }),
      expect.objectContaining({ type: 'rfq_error' }),
    ]);
  });

  it('rejects unknown and malformed known message variants', () => {
    expect(
      RfqQuoterInboundMessageSchema.safeParse({ type: 'RFQ_FUTURE_MESSAGE' })
        .success,
    ).toBe(false);
    expect(
      RfqQuoterInboundMessageSchema.safeParse({
        rfq_id: 'rfq-1',
        type: 'ACK_RFQ_QUOTE',
      }).success,
    ).toBe(false);
  });
});
