import { WalletType } from '@polymarket/bindings/gamma';
import { expectPresent, invariant } from '@polymarket/types';
import { describe, expect, it, vi } from 'vitest';
import {
  createSecureClientWithDepositWallet,
  publicClient,
  relayerAuthorization,
} from '../testing';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';

const market = await publicClient.fetchMarket({
  slug: TEST_MARKET_SLUG,
});
const conditionId = expectPresent(market.conditionId);

const secureClient = await createSecureClientWithDepositWallet({
  apiKey: relayerAuthorization,
});

invariant(
  secureClient.account.walletType === WalletType.DEPOSIT_WALLET,
  'Expected a Deposit Wallet for testing',
);

describe('Positions', () => {
  it('splits a market position', async () => {
    await secureClient
      .splitPosition({
        amount: 1_000_000n,
        conditionId,
      })
      .then((handle) => handle.wait());

    await vi.waitFor(
      async () => {
        const positions = await secureClient
          .listPositions({
            user: secureClient.account.wallet,
            market: [conditionId],
          })
          .firstPage();
        expect(positions.items).toHaveLength(2);
      },
      { timeout: 15_000 },
    );
  }, 20_000);

  it('merges complementary positions', async ({ skip }) => {
    const positions = await secureClient
      .listPositions({
        user: secureClient.account.wallet,
        market: [conditionId],
      })
      .firstPage();

    if (positions.items.length < 2) {
      skip('Not enough positions to merge');
    }

    await secureClient
      .mergePositions({
        amount: 'max',
        conditionId,
      })
      .then((handle) => handle.wait());

    await vi.waitFor(
      async () => {
        const positions = await secureClient
          .listPositions({
            user: secureClient.account.wallet,
            market: [conditionId],
          })
          .firstPage();
        expect(positions.items).toHaveLength(0);
      },
      { timeout: 15_000 },
    );
  }, 20_000);
});
