import { SignatureType } from '@polymarket/bindings/clob';

export const QUOTE_ID = 'quote-1';
export const QUOTE_SIZE_E6 = 1_000_000;

const RFQ_ID = 'rfq-1';

const signerAddress = '0x1111111111111111111111111111111111111111';
const makerAddress = '0x2222222222222222222222222222222222222222';

export function authAckFrame() {
  return {
    address: signerAddress,
    role: 'maker',
    success: true,
    type: 'auth',
  };
}

export function quoteRequestFrame() {
  return {
    condition_id:
      '0x032def24bfb0c5c57fb236fac08b94236a000000000000000000000000000000',
    direction: 'BUY',
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

export function quoteAckFrame() {
  return {
    quote_id: QUOTE_ID,
    rfq_id: RFQ_ID,
    type: 'ACK_RFQ_QUOTE',
  };
}

export function confirmationRequestFrame(priceE6: number, fillSizeE6: number) {
  return {
    ...quoteRequestFrame(),
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

export function confirmationAckFrame() {
  return {
    decision: 'CONFIRM',
    quote_id: QUOTE_ID,
    rfq_id: RFQ_ID,
    type: 'ACK_RFQ_CONFIRMATION_RESPONSE',
  };
}
