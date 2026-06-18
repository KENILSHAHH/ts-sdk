import { describe, expect, it } from 'vitest';
import {
  RawPerpsPublicTradeResponseSchema,
  RawPerpsPublicTradeSchema,
} from './market';

const txHash = `0x${'1'.repeat(64)}`;

describe('RawPerpsPublicTradeSchema', () => {
  it('normalizes placeholder hashes to undefined', () => {
    const trade = RawPerpsPublicTradeSchema.parse({
      trade_id: 1,
      instrument_id: 6,
      side: 'long',
      price: '1',
      quantity: '2',
      timestamp: 1_700_000_000_000,
      hash: '0x',
    });

    expect(trade.hash).toBeUndefined();
  });

  it('preserves valid transaction hashes', () => {
    const trade = RawPerpsPublicTradeSchema.parse({
      trade_id: 1,
      instrument_id: 6,
      side: 'long',
      price: '1',
      quantity: '2',
      timestamp: 1_700_000_000_000,
      hash: txHash,
    });

    expect(trade.hash).toBe(txHash);
  });
});

describe('RawPerpsPublicTradeResponseSchema', () => {
  it('normalizes compact placeholder hashes to undefined', () => {
    const trade = RawPerpsPublicTradeResponseSchema.parse({
      tid: 1,
      iid: 6,
      side: 'long',
      p: '1',
      qty: '2',
      ts: 1_700_000_000_000,
      hash: '0x',
    });

    expect(trade.hash).toBeUndefined();
  });
});
