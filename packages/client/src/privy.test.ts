import {
  type AcceptedOrderResponse,
  AssetType,
  OrderSide,
} from '@polymarket/bindings/clob';
import { expectEvmAddress, expectPresent } from '@polymarket/types';
// biome-ignore lint/style/noRestrictedImports: @privy-io/node is the intentional external adapter target for this entrypoint.
import { PrivyClient } from '@privy-io/node';
import { beforeAll, describe, expect, it } from 'vitest';
import { deriveSafeWalletAddress } from './account';
import {
  cancelOrder,
  fetchApiKeys,
  fetchBalanceAllowance,
  fetchMarket,
  prepareLimitOrderPosting,
  prepareTradingApprovals,
} from './actions';
import { isGaslessReady, prepareGaslessWallet } from './actions/gasless';
import {
  authenticateWith,
  completeWith,
  type PrivyWalletConfig,
} from './privy';
import {
  publicClient,
  publicClientWithBuilderKey,
  runMeteredTests,
} from './testing';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';

const hasPrivyTestConfig =
  process.env.PRIVY_TEST_APP_ID !== undefined &&
  process.env.PRIVY_TEST_APP_SECRET !== undefined &&
  process.env.PRIVY_TEST_WALLET_ID !== undefined;

describe.runIf(hasPrivyTestConfig)('privy', () => {
  let hasCollateralBalance = false;
  let wallet: PrivyWalletConfig;
  let safeWalletAddress: `0x${string}`;

  beforeAll(async () => {
    const privy = new PrivyClient({
      appId: expectPresent(process.env.PRIVY_TEST_APP_ID),
      appSecret: expectPresent(process.env.PRIVY_TEST_APP_SECRET),
    });
    const walletId = expectPresent(process.env.PRIVY_TEST_WALLET_ID);
    const signerAddress = expectEvmAddress(
      (await privy.wallets().get(walletId)).address,
    );

    wallet = {
      privy,
      walletId,
    };
    safeWalletAddress = deriveSafeWalletAddress(
      signerAddress,
      publicClientWithBuilderKey.environment.walletDerivation,
    );

    if (
      !(await isGaslessReady(publicClientWithBuilderKey, {
        wallet: safeWalletAddress,
      }))
    ) {
      const handle = await prepareGaslessWallet(
        publicClientWithBuilderKey,
      ).then(completeWith(wallet));

      expect(handle.wallet).toBe(safeWalletAddress);
      await handle.wait();
    }

    if (runMeteredTests) {
      const secureClient = await publicClientWithBuilderKey
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(wallet));

      hasCollateralBalance =
        (
          await fetchBalanceAllowance(secureClient, {
            assetType: AssetType.COLLATERAL,
          })
        ).balance !== '0';

      if (hasCollateralBalance) {
        const handle = await prepareTradingApprovals(secureClient).then(
          completeWith(wallet),
        );

        await handle.wait();
      }
    }
  }, 120_000);

  describe('authenticateWith', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(wallet));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });

  describe('completeWith', () => {
    it.runIf(runMeteredTests)(
      'places and cancels a limit order',
      async () => {
        const market = await fetchMarket(publicClient, {
          slug: TEST_MARKET_SLUG,
        });
        const [yesTokenId] = expectPresent(market.clobTokenIds);
        const price = expectPresent(market.orderPriceMinTickSize);
        const size = expectPresent(market.orderMinSize);
        const secureClient = await publicClient
          .beginAuthentication({ wallet: safeWalletAddress })
          .then(authenticateWith(wallet));

        if (!hasCollateralBalance) {
          return;
        }

        const response = await prepareLimitOrderPosting(secureClient, {
          price,
          size,
          side: OrderSide.BUY,
          tokenId: yesTokenId,
        }).then(completeWith(wallet));

        expect(response.ok).toBe(true);
        const acceptedResponse = expectAcceptedOrderResponse(response);

        await expect(
          cancelOrder(secureClient, { orderId: acceptedResponse.orderId }),
        ).resolves.toEqual(
          expect.objectContaining({
            canceled: expect.arrayContaining([acceptedResponse.orderId]),
          }),
        );
      },
      120_000,
    );
  });
});

function expectAcceptedOrderResponse(response: unknown): AcceptedOrderResponse {
  expect(response).toEqual(expect.objectContaining({ ok: true }));

  return response as AcceptedOrderResponse;
}
