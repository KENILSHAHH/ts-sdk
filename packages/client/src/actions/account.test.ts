import { AssetType } from '@polymarket/bindings/clob';
import { describe, expect, it } from 'vitest';
import { createTestWalletClient, publicClient } from '../testing';
import { authenticateWith } from '../viem';
import {
  fetchBalanceAllowance,
  fetchClosedOnlyMode,
  fetchNotifications,
  fetchOpenOrders,
  fetchTrades,
} from './account';

describe('Account', () => {
  describe('authenticated reads', () => {
    it('fetches authenticated account state', async () => {
      const secureClient = await publicClient
        .beginAuthentication()
        .then(authenticateWith(createTestWalletClient()));

      const [closedOnly, openOrders, trades, notifications, balanceAllowance] =
        await Promise.all([
          fetchClosedOnlyMode(secureClient),
          fetchOpenOrders(secureClient),
          fetchTrades(secureClient),
          fetchNotifications(secureClient),
          fetchBalanceAllowance(secureClient, {
            assetType: AssetType.COLLATERAL,
          }),
        ]);

      expect(typeof closedOnly).toBe('boolean');
      expect(Array.isArray(openOrders)).toBe(true);
      expect(Array.isArray(trades)).toBe(true);
      expect(Array.isArray(notifications)).toBe(true);
      expect(balanceAllowance).toEqual(
        expect.objectContaining({
          allowances: expect.any(Object),
          balance: expect.any(String),
        }),
      );
    });
  });
});
