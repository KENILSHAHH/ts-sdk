import { describe, expect, it } from 'vitest';
import { ClobTradeSchema } from './account';

const baseTrade = {
  token_id: '1',
  bucket_index: 7,
  fee_rate_bps: '0',
  id: 'trade-1',
  maker_address: `0x${'aa'.repeat(20)}`,
  maker_orders: [
    {
      fee_rate_bps: '0',
      maker_address: `0x${'bb'.repeat(20)}`,
      matched_amount: '1.5',
      order_id: 'order-1',
      outcome: 'Yes',
      owner: 'owner-1',
      price: '0.5',
      side: 'BUY',
      token_id: '1',
    },
  ],
  market_id: `0x${'cc'.repeat(32)}`,
  outcome: 'Yes',
  owner: 'owner-1',
  price: '0.5',
  side: 'BUY',
  size: '1.5',
  status: 'CONFIRMED',
  taker_order_id: 'order-2',
  trader_side: 'TAKER',
  transaction_hash: `0x${'dd'.repeat(32)}`,
};

describe('ClobTradeSchema', () => {
  it('normalizes unified account trade responses', () => {
    const trade = ClobTradeSchema.parse({
      ...baseTrade,
      match_time: 1_777_996_829_000,
      last_update: 1_777_996_840_000,
    });

    expect(trade.market).toBe(baseTrade.market_id);
    expect(trade.tokenId).toBe(baseTrade.token_id);
    expect(trade.makerOrders[0]?.tokenId).toBe('1');
    expect(trade.matchedAt).toBe('2026-05-05T16:00:29.000Z');
    expect(trade.updatedAt).toBe('2026-05-05T16:00:40.000Z');
  });
});
