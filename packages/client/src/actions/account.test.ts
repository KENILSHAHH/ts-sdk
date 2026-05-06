import { AssetType } from '@polymarket/bindings/clob';
import { describe, expect, it } from 'vitest';
import type { AccountActions } from '../decorators';
import { createSecureClientWithDepositWallet } from '../testing';
import { fetchBalanceAllowance } from './account';

const secureClient = await createSecureClientWithDepositWallet();

describe('Account', () => {
  describe('fetchClosedOnlyMode', () => {
    it('fetches closed-only mode', async () => {
      const closedOnly = await secureClient.fetchClosedOnlyMode();
      expect(typeof closedOnly).toBe('boolean');
    });
  });

  describe('listOpenOrders', () => {
    it('lists open orders', async () => {
      const openOrders = await secureClient.listOpenOrders().firstPage();
      expect(Array.isArray(openOrders.items)).toBe(true);
    });
  });

  describe('listAccountTrades', () => {
    it('lists account trades', async () => {
      const trades = await secureClient.listAccountTrades().firstPage();
      expect(Array.isArray(trades.items)).toBe(true);
    });
  });

  describe('fetchNotifications', () => {
    it('fetches notifications', async () => {
      const notifications = await secureClient.fetchNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  describe('fetchBalanceAllowance', () => {
    it('fetches balance allowance', async () => {
      const balanceAllowance = await fetchBalanceAllowance(secureClient, {
        assetType: AssetType.COLLATERAL,
      });

      expect(balanceAllowance).toEqual(
        expect.objectContaining({
          allowances: expect.any(Object),
          balance: expect.any(String),
        }),
      );
    });
  });

  describe('dropNotifications', () => {
    it('marks notifications as read by id', async () => {
      const notifications = await secureClient.fetchNotifications();

      if (notifications.length === 0) {
        return;
      }

      const ids = notifications.slice(0, 1).map(({ id }) => `${id}`);

      await expect(
        secureClient.dropNotifications({
          ids,
        }),
      ).resolves.toBeUndefined();

      const remainingNotifications = await waitForNotificationsToClear(
        secureClient,
        ids,
      );

      expect(
        remainingNotifications.some(({ id }) => ids.includes(`${id}`)),
      ).toBe(false);
    });
  });
});

async function waitForNotificationsToClear(
  secureClient: Pick<AccountActions, 'fetchNotifications'>,
  ids: string[],
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const notifications = await secureClient.fetchNotifications();

    if (!notifications.some(({ id }) => ids.includes(`${id}`))) {
      return notifications;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return secureClient.fetchNotifications();
}
