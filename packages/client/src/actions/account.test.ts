import { AssetType } from '@polymarket/bindings/clob';
import { describe, expect, it } from 'vitest';
import type { SecureClient } from '../clients';
import { publicClient, safeWalletAddress, walletClient } from '../testing';
import { authenticateWith } from '../viem';
import {
  dropNotifications,
  fetchBalanceAllowance,
  fetchClosedOnlyMode,
  fetchNotifications,
  listAccountTrades,
  listOpenOrders,
} from './account';

describe('Account', () => {
  describe('authenticated reads', () => {
    it('fetches authenticated account state', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      const [closedOnly, openOrders, trades, notifications, balanceAllowance] =
        await Promise.all([
          fetchClosedOnlyMode(secureClient),
          listOpenOrders(secureClient).firstPage(),
          listAccountTrades(secureClient).firstPage(),
          fetchNotifications(secureClient),
          fetchBalanceAllowance(secureClient, {
            assetType: AssetType.COLLATERAL,
          }),
        ]);

      expect(typeof closedOnly).toBe('boolean');
      expect(Array.isArray(openOrders.items)).toBe(true);
      expect(Array.isArray(trades.items)).toBe(true);
      expect(Array.isArray(notifications)).toBe(true);
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
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(walletClient));

      const notifications = await fetchNotifications(secureClient);

      if (notifications.length === 0) {
        await expect(
          dropNotifications(secureClient, {
            ids: ['0'],
          }),
        ).rejects.toMatchObject({
          status: 400,
        });

        return;
      }

      const ids = notifications.slice(0, 1).map(({ id }) => `${id}`);

      await expect(
        dropNotifications(secureClient, {
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
  secureClient: SecureClient,
  ids: string[],
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const notifications = await fetchNotifications(secureClient);

    if (!notifications.some(({ id }) => ids.includes(`${id}`))) {
      return notifications;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return fetchNotifications(secureClient);
}
