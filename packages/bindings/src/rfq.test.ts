import { describe, expect, it } from 'vitest';
import { RfqErrorCode, RfqErrorMessageSchema } from './rfq';

describe('RFQ message schemas', () => {
  it('parses balance and reservation RFQ error codes', () => {
    for (const code of [
      RfqErrorCode.AllowanceValidationFailed,
      RfqErrorCode.BalanceValidationFailed,
      RfqErrorCode.PreExecutionBalanceReservationFailed,
    ]) {
      expect(
        RfqErrorMessageSchema.parse({
          code,
          error: 'quote rejected',
          request_type: 'RFQ_QUOTE',
          type: 'RFQ_ERROR',
        }).code,
      ).toBe(code);
    }
  });
});
