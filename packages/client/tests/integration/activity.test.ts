import { expectPresent, isSameEvmAddress } from '@polymarket/types';
import { describe, expect, it } from './fixtures';
import { expectNonEmptyPage, expectPageWindow } from './helpers';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe('Activity', () => {
  describe('listTrades', () => {
    it('lists trades for a wallet', async ({ publicClient }) => {
      const result = await publicClient
        .listTrades({
          user: TEST_USER,
          pageSize: 1,
        })
        .firstPage();

      expect(result.items).toHaveLength(1);
      expect(expectPresent(result.items[0])).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          wallet: TEST_USER,
        }),
      );
    });

    it('lists global trades across pages', async ({ publicClient }) => {
      const paginator = publicClient.listTrades({
        pageSize: 100,
      });
      const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

      expect(firstPage.items.length).toBeGreaterThan(0);
      await expectPageWindow(paginator, firstPage, 29);
    });
  });

  describe('listActivity', () => {
    it('lists wallet activity', async ({ publicClient }) => {
      const paginator = publicClient.listActivity({
        user: TEST_USER,
        pageSize: 100,
        type: ['TRADE'],
      });
      const result = await paginator.firstPage().then(expectNonEmptyPage);

      expect(result.items.length).toBeGreaterThan(0);
      await expectPageWindow(paginator, result, 29);
      expect(expectPresent(result.items[0])).toEqual(
        expect.objectContaining({
          conditionId: expect.any(String),
          type: 'TRADE',
          wallet: TEST_USER,
        }),
      );
    });

    it('defaults secure clients to the authenticated wallet', async ({
      depositWalletAddress,
      secureClientWithDepositWallet,
    }) => {
      const result = await secureClientWithDepositWallet
        .listActivity({ pageSize: 1, type: ['TRADE'] })
        .firstPage()
        .then(expectNonEmptyPage);

      expect(expectPresent(result.items[0]).wallet).toSatisfy((wallet) =>
        isSameEvmAddress(wallet, depositWalletAddress),
      );
    });
  });
});
