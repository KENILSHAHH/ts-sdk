import { describe, expect, it } from 'vitest';
import { expectNonEmptyPage, publicClient } from '../testing';
import { listActivity, listTrades } from './activity';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe('Activity', () => {
  describe('listTrades', () => {
    it('lists trades for a wallet', async () => {
      const result = await listTrades(publicClient, {
        user: TEST_USER,
        pageSize: 1,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          proxyWallet: TEST_USER,
        }),
      );
    });
  });

  describe('listActivity', () => {
    it('lists wallet activity', async () => {
      const result = await listActivity(publicClient, {
        user: TEST_USER,
        pageSize: 1,
      })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          proxyWallet: TEST_USER,
          type: expect.any(String),
        }),
      );
    });
  });
});
