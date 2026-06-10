import { describe, expect, it } from 'vitest';
import {
  RfqErrorCode,
  RfqErrorMessageSchema,
  RfqQuoterInboundMessageSchema,
} from './rfq';

const submissionWindowClosedFrame = {
  type: 'RFQ_ERROR',
  request_type: 'RFQ_QUOTE',
  rfq_id: 'rfq-c15f7fc296f86370c2833932',
  code: 'SUBMISSION_WINDOW_CLOSED',
  error: 'submission window closed',
};

describe('RFQ error messages', () => {
  it('parses submission-window quote rejections', () => {
    expect(RfqErrorMessageSchema.parse(submissionWindowClosedFrame)).toEqual({
      code: RfqErrorCode.SubmissionWindowClosed,
      message: 'submission window closed',
      quoteId: undefined,
      requestType: 'RFQ_QUOTE',
      rfqId: 'rfq-c15f7fc296f86370c2833932',
      type: 'rfq_error',
    });

    expect(
      RfqQuoterInboundMessageSchema.safeParse(submissionWindowClosedFrame)
        .success,
    ).toBe(true);
  });
});
