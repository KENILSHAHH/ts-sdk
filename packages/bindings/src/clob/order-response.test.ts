import { describe, expect, it } from 'vitest';
import { OrderPostStatus, OrderResponseSchema } from './order-response';

describe('OrderResponseSchema', () => {
  it('normalizes empty making/taking amounts on a live order to zero', () => {
    const response = OrderResponseSchema.parse({
      errorMsg: '',
      makingAmount: '',
      orderID: 'order-1',
      status: 'live',
      success: true,
      takingAmount: '',
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.status).toBe(OrderPostStatus.LIVE);
      expect(response.makingAmount).toBe('0');
      expect(response.takingAmount).toBe('0');
    }
  });

  it('normalizes populated making/taking e6 amounts to decimal strings', () => {
    const response = OrderResponseSchema.parse({
      errorMsg: '',
      makingAmount: '10500000',
      orderID: 'order-2',
      status: 'matched',
      success: true,
      takingAmount: '21000000',
      tradeIDs: ['trade-1'],
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.makingAmount).toBe('10.5');
      expect(response.takingAmount).toBe('21');
    }
  });
});
