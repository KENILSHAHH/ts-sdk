import { createSecureClient, WalletType } from '@polymarket/client';
import { expectPresent } from '@polymarket/types';
import { vi } from 'vitest';
import { describe, expect, it, publicClient } from './fixtures';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';
const conditionId = await publicClient
  .fetchMarket({
    slug: TEST_MARKET_SLUG,
  })
  .then((market) => expectPresent(market.conditionId));

describe('Positions', () => {
  // Pending an investigation into split positions not being returned by the Data API
  it.skip('splits a market position', async ({
    depositWalletAddress,
    depositWalletSigner,
    relayerAuthentication,
  }) => {
    const secureClient = await createSecureClient({
      apiKey: relayerAuthentication,
      signer: depositWalletSigner,
      wallet: depositWalletAddress,
    });

    expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

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

  it('merges complementary positions', async ({
    depositWalletAddress,
    depositWalletSigner,
    relayerAuthentication,
    skip,
  }) => {
    const secureClient = await createSecureClient({
      apiKey: relayerAuthentication,
      signer: depositWalletSigner,
      wallet: depositWalletAddress,
    });

    expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

    const { items: positions } = await secureClient
      .listPositions({
        user: secureClient.account.wallet,
        market: [conditionId],
      })
      .firstPage();

    if (positions.length < 2) {
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
