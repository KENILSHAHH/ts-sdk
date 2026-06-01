import { SignatureType } from '@polymarket/bindings/clob';
import { RfqExecutionStatus } from '@polymarket/bindings/rfq';
import { invariant } from '@polymarket/types';

export const RFQ_ID = 'rfq-1';
export const QUOTE_ID = 'quote-1';
export const QUOTE_SIZE_E6 = 1_000_000;
export const TX_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111';

const signerAddress = '0x1111111111111111111111111111111111111111';
const makerAddress = '0x2222222222222222222222222222222222222222';

export type OutboundFrame = {
  decision?: unknown;
  price_e6?: unknown;
  size_e6?: unknown;
  signed_order?: unknown;
  type?: string;
};

export function recordOutboundFrame(
  data: unknown,
  frames: OutboundFrame[],
): OutboundFrame {
  const frame = JSON.parse(String(data)) as OutboundFrame;
  frames.push(frame);
  return frame;
}

export function quoteAmounts(frame: OutboundFrame) {
  invariant(typeof frame.price_e6 === 'number', 'Expected RFQ quote price.');
  invariant(typeof frame.size_e6 === 'number', 'Expected RFQ quote size.');

  return {
    priceE6: frame.price_e6,
    sizeE6: frame.size_e6,
  };
}

export function confirmationDecision(frame: OutboundFrame) {
  invariant(
    typeof frame.decision === 'string',
    'Expected RFQ confirmation decision.',
  );

  return frame.decision;
}

export function authAckFrame() {
  return {
    address: signerAddress,
    role: 'maker',
    success: true,
    type: 'auth',
  };
}

export function authAckMessage() {
  return JSON.stringify(authAckFrame());
}

export function quoteRequestFrame(
  options: { direction?: 'BUY' | 'SELL' } = {},
) {
  return {
    condition_id:
      '0x032def24bfb0c5c57fb236fac08b94236a000000000000000000000000000000',
    direction: options.direction ?? 'BUY',
    leg_position_ids: ['1', '2'],
    no_position_id: '456',
    requestor_public_id: 'req-1',
    rfq_id: RFQ_ID,
    side: 'YES',
    size_e6: QUOTE_SIZE_E6,
    submission_deadline: 123,
    type: 'RFQ_REQUEST',
    yes_position_id: '123',
  };
}

export function quoteRequestMessage(
  options: { direction?: 'BUY' | 'SELL' } = {},
) {
  return JSON.stringify(quoteRequestFrame(options));
}

export function quoteAckFrame() {
  return {
    quote_id: QUOTE_ID,
    rfq_id: RFQ_ID,
    type: 'ACK_RFQ_QUOTE',
  };
}

export function quoteAckMessage() {
  return JSON.stringify(quoteAckFrame());
}

export function confirmationRequestFrame(
  priceE6: number,
  fillSizeE6: number,
  options: { direction?: 'BUY' | 'SELL' } = {},
) {
  return {
    ...quoteRequestFrame(options),
    confirm_by: 456,
    fill_size_e6: fillSizeE6,
    maker_address: makerAddress,
    price_e6: priceE6,
    quote_id: QUOTE_ID,
    signature_type: SignatureType.EOA,
    signer_address: signerAddress,
    type: 'RFQ_CONFIRMATION_REQUEST',
  };
}

export function confirmationRequestMessage(
  priceE6: number,
  fillSizeE6: number,
  options: { direction?: 'BUY' | 'SELL' } = {},
) {
  return JSON.stringify(confirmationRequestFrame(priceE6, fillSizeE6, options));
}

export function confirmationAckFrame(decision: string) {
  return {
    decision,
    quote_id: QUOTE_ID,
    rfq_id: RFQ_ID,
    type: 'ACK_RFQ_CONFIRMATION_RESPONSE',
  };
}

export function confirmationAckMessage(decision: string) {
  return JSON.stringify(confirmationAckFrame(decision));
}

export function executionUpdateFrame() {
  return {
    rfq_id: RFQ_ID,
    status: RfqExecutionStatus.Confirmed,
    tx_hash: TX_HASH,
    type: 'RFQ_EXECUTION_UPDATE',
  };
}

export function executionUpdateMessage() {
  return JSON.stringify(executionUpdateFrame());
}
