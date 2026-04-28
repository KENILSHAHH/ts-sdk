import { WalletType } from '@polymarket/bindings/gamma';
import { invariant } from '@polymarket/types';
import { describe, expect, it, vi } from 'vitest';
import {
  publicClient,
  publicClientWithRelayerKey,
  safeWalletAddress,
  walletClient,
} from '../testing';
import { authenticateWith, completeWith } from '../viem';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';

const market = await publicClient.fetchMarket({
  slug: TEST_MARKET_SLUG,
});

const secureClient = await publicClientWithRelayerKey
  .beginAuthentication({ wallet: safeWalletAddress })
  .then(authenticateWith(walletClient));

invariant(
  secureClient.account.walletType === WalletType.POLY_GNOSIS_SAFE,
  'Expected a Gnosis Safe wallet for testing',
);

describe('Positions', () => {
  it('splits a market position', async () => {
    await secureClient
      .prepareSplitPosition({
        amount: 1_000_000n,
        conditionId: market.conditionId,
      })
      .then(completeWith(walletClient))
      .then((handle) => handle.wait());

    await vi.waitFor(
      async () => {
        const positions = await secureClient
          .listPositions({
            user: secureClient.account.wallet,
            market: [market.conditionId],
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
        market: [market.conditionId],
      })
      .firstPage();

    if (positions.items.length < 2) {
      skip('Not enough positions to merge');
    }

    await secureClient
      .prepareMergePositions({
        amount: 'max',
        conditionId: market.conditionId,
      })
      .then(completeWith(walletClient))
      .then((handle) => handle.wait());

    await vi.waitFor(
      async () => {
        const positions = await secureClient
          .listPositions({
            user: secureClient.account.wallet,
            market: [market.conditionId],
          })
          .firstPage();
        expect(positions.items).toHaveLength(0);
      },
      { timeout: 15_000 },
    );
  }, 20_000);
});
