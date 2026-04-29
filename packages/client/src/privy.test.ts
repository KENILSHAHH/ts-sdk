import { OrderSide } from '@polymarket/bindings';
import {
  type AcceptedOrderResponse,
  AssetType,
} from '@polymarket/bindings/clob';
import { expectEvmAddress, expectPresent } from '@polymarket/types';
import { PrivyClient } from '@privy-io/node';
import { beforeAll, describe, expect, it } from 'vitest';
import { deriveSafeWalletAddress } from './account';
import {
  cancelOrder,
  fetchApiKeys,
  fetchBalanceAllowance,
  fetchMarket,
} from './actions';
import { isGaslessReady } from './actions/gasless';
import { createSecureClient } from './clients';
import { type PrivyWalletConfig, signerFrom } from './privy';
import {
  builderAuthorization,
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
      const secureClient = await createSecureClient({
        apiKey: builderAuthorization,
        signer: signerFrom(wallet),
        wallet: safeWalletAddress,
      });
      const handle = await secureClient.setupGaslessWallet();

      expect(handle.wallet).toBe(safeWalletAddress);
      await handle.wait();
    }

    if (runMeteredTests) {
      const secureClient = await createSecureClient({
        apiKey: builderAuthorization,
        signer: signerFrom(wallet),
        wallet: safeWalletAddress,
      });

      hasCollateralBalance =
        (
          await fetchBalanceAllowance(secureClient, {
            assetType: AssetType.COLLATERAL,
          })
        ).balance !== '0';

      if (hasCollateralBalance) {
        const handle = await secureClient.setupTradingApprovals();

        await handle.wait();
      }
    }
  }, 120_000);

  describe('signerFrom', () => {
    it('authenticates a secure client', async () => {
      const secureClient = await createSecureClient({
        signer: signerFrom(wallet),
        wallet: safeWalletAddress,
      });

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });

  describe('wallet operations', () => {
    it.runIf(runMeteredTests)(
      'places and cancels a limit order',
      async () => {
        const market = await fetchMarket(publicClient, {
          slug: TEST_MARKET_SLUG,
        });
        const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
        const price = expectPresent(market.trading.minimumTickSize);
        const size = expectPresent(market.trading.minimumOrderSize);
        const secureClient = await createSecureClient({
          signer: signerFrom(wallet),
          wallet: safeWalletAddress,
        });

        if (!hasCollateralBalance) {
          return;
        }

        const response = await secureClient.placeLimitOrder({
          price,
          size,
          side: OrderSide.BUY,
          tokenId: yesTokenId,
        });

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
