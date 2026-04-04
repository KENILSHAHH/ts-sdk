import { describe, expect, it } from 'vitest';
import { testClient } from '../testing';
import { fetchFeeRate, fetchNegRisk, fetchTickSize } from './clob';
import { listMarkets } from './markets';

describe('CLOB', () => {
  describe('fetchTickSize', () => {
    it('fetches the minimum tick size for a token', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchTickSize(testClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('fetchNegRisk', () => {
    it('fetches whether a token is negative risk', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchNegRisk(testClient, {
        tokenId,
      });

      expect(typeof result).toBe('boolean');
    });
  });

  describe('fetchFeeRate', () => {
    it('fetches the fee rate for a token', async () => {
      const tokenId = await getClobTokenId();

      const result = await fetchFeeRate(testClient, {
        tokenId,
      });

      expect(result).toEqual(expect.any(Number));
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});

async function getClobTokenId(): Promise<string> {
  const markets = await listMarkets(testClient, {
    closed: false,
    limit: 10,
  });

  for (const market of markets) {
    const tokenId = parseFirstClobTokenId(market.clobTokenIds);

    if (tokenId) {
      return tokenId;
    }
  }

  throw new Error('Expected at least one live market with a CLOB token id');
}

function parseFirstClobTokenId(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const [tokenId] = parsed;

    return typeof tokenId === 'string' ? tokenId : undefined;
  } catch {
    return undefined;
  }
}
