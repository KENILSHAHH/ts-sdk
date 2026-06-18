import { describe, expect, it } from 'vitest';
import { RawPerpsAccountFillSchema } from './orders';

const baseFill = {
  trade_id: 1,
  order_id: 2,
  instrument_id: 6,
  side: 'long',
  price: '1',
  quantity: '2',
  taker: true,
  fee: '0.01',
  fee_asset: 'USDC',
  previous_size: '0',
  previous_entry_price: '0',
  pnl: '0',
  liquidation: false,
  timestamp: 1_700_000_000_000,
};

describe('RawPerpsAccountFillSchema', () => {
  it('normalizes placeholder hashes to undefined', () => {
    const fill = RawPerpsAccountFillSchema.parse({
      ...baseFill,
      hash: '0x',
    });

    expect(fill.hash).toBeUndefined();
  });
});
