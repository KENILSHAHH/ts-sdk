import { describe, expect, it } from 'vitest';
import { TradeStatus, UserEventSchema } from './clob';

describe('UserEventSchema', () => {
  it('accepts short trade statuses from the user websocket and normalizes them', () => {
    const result = UserEventSchema.safeParse({
      asset_id: '1',
      event_type: 'trade',
      fee_rate_bps: '0',
      id: 'trade-1',
      last_update: '1710000000',
      maker_address: '0x0000000000000000000000000000000000000001',
      market: 'market-1',
      match_time: '1710000000',
      owner: 'owner-1',
      price: '0.5',
      side: 'BUY',
      size: '1',
      status: 'CONFIRMED',
      taker_order_id: 'order-1',
      timestamp: '1710000000000',
      trade_owner: 'owner-1',
      type: 'TRADE',
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw result.error;
    }

    expect(result.data).toMatchObject({
      payload: {
        status: TradeStatus.Confirmed,
      },
      topic: 'user',
      type: 'trade',
    });
  });

  it('still accepts prefixed trade statuses', () => {
    const result = UserEventSchema.safeParse({
      asset_id: '1',
      event_type: 'trade',
      fee_rate_bps: '0',
      id: 'trade-2',
      last_update: '1710000000',
      maker_address: '0x0000000000000000000000000000000000000001',
      market: 'market-1',
      match_time: '1710000000',
      owner: 'owner-1',
      price: '0.5',
      side: 'BUY',
      size: '1',
      status: TradeStatus.Matched,
      taker_order_id: 'order-2',
      timestamp: '1710000000001',
      trade_owner: 'owner-1',
      type: 'TRADE',
    });

    expect(result.success).toBe(true);
  });
});
