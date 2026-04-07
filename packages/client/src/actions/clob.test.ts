import { expectPresent, never } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import {
  fetchFeeRate,
  fetchNegRisk,
  fetchOrderBook,
  fetchTickSize,
} from './clob';
import { listMarkets } from './markets';

describe('CLOB', () => {
  describe('fetchTickSize', () => {
    it('fetches the minimum tick size for a token', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchTickSize(publicClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('fetchNegRisk', () => {
    it('fetches whether a token is negative risk', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchNegRisk(publicClient, {
        tokenId,
      });

      expect(typeof result).toBe('boolean');
    });
  });

  describe('fetchFeeRate', () => {
    it('fetches the fee rate for a token', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchFeeRate(publicClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fetchOrderBook', () => {
    it('fetches the order book for a token', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchOrderBook(publicClient, {
        tokenId,
      });

      expect(result.asset_id).toBe(tokenId);
      expect(Array.isArray(result.bids)).toBe(true);
      expect(Array.isArray(result.asks)).toBe(true);
      expect(result.tick_size).toEqual(expect.any(String));
      expect(result.min_order_size).toEqual(expect.any(String));
      expect(result.neg_risk).toEqual(expect.any(Boolean));
      expect(result.hash).toEqual(expect.any(String));
    });
  });
});

async function getClobTokenId(): Promise<string> {
  const markets = await listMarkets(publicClient, {
    closed: false,
    limit: 10,
  });

  for (const market of markets) {
    const [tokenId] = expectPresent(market.clobTokenIds);

    return tokenId;
  }

  never('Expected at least one live market with a CLOB token id');
}
