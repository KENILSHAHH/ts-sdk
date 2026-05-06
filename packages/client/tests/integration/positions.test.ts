import {
  createSecureClient,
  type PublicClient,
  WalletType,
} from '@polymarket/client';
import { expectPresent } from '@polymarket/types';
import { vi } from 'vitest';
import { describe, expect, it } from './fixtures';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';

let conditionIdPromise: Promise<string> | undefined;

describe('Positions', () => {
  it('splits a market position', async ({
    depositWalletAddress,
    depositWalletSigner,
    publicClient,
    relayerAuthentication,
  }) => {
    const conditionId = await fetchTestConditionId(publicClient);
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
    publicClient,
    relayerAuthentication,
    skip,
  }) => {
    const conditionId = await fetchTestConditionId(publicClient);
    const secureClient = await createSecureClient({
      apiKey: relayerAuthentication,
      signer: depositWalletSigner,
      wallet: depositWalletAddress,
    });

    expect(secureClient.account.walletType).toBe(WalletType.DEPOSIT_WALLET);

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

async function fetchTestConditionId(publicClient: PublicClient) {
  conditionIdPromise ??= publicClient
    .fetchMarket({
      slug: TEST_MARKET_SLUG,
    })
    .then((market) => expectPresent(market.conditionId));

  return conditionIdPromise;
}
