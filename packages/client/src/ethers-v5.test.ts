import { OrderSide } from '@polymarket/bindings';
import type { AcceptedOrderResponse } from '@polymarket/bindings/clob';
import { expectPresent } from '@polymarket/types';
import { ethers } from 'ethers-v5';
import { polygon } from 'viem/chains';
import { describe, expect, it } from 'vitest';
import {
  cancelOrder,
  fetchApiKeys,
  fetchMarket,
  prepareLimitOrderPosting,
} from './actions';
import { authenticateWith, completeWith } from './ethers-v5';
import {
  publicClient,
  runMeteredTests,
  safeWalletAddress,
  testPrivateKey,
} from './testing';

const TEST_MARKET_SLUG = 'eth-flipped-in-2026';

const provider = new ethers.providers.JsonRpcProvider(
  polygon.rpcUrls.default.http[0],
  {
    chainId: polygon.id,
    name: polygon.name,
  },
);

function createSigner() {
  return new ethers.Wallet(testPrivateKey, provider);
}

describe('ethers-v5', () => {
  describe('authenticateWith', () => {
    it('authenticates a secure client from an authentication workflow', async () => {
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(createSigner()));

      await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
    });
  });

  describe('completeWith', () => {
    it.runIf(runMeteredTests)('places and cancels a limit order', async () => {
      const signer = createSigner();
      const market = await fetchMarket(publicClient, {
        slug: TEST_MARKET_SLUG,
      });
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
      const price = expectPresent(market.trading.minimumTickSize);
      const size = expectPresent(market.trading.minimumOrderSize);
      const secureClient = await publicClient
        .beginAuthentication({ wallet: safeWalletAddress })
        .then(authenticateWith(signer));

      const response = await prepareLimitOrderPosting(secureClient, {
        price,
        size,
        side: OrderSide.BUY,
        tokenId: yesTokenId,
      }).then(completeWith(signer));

      expect(response.ok).toBe(true);
      const acceptedResponse = expectAcceptedOrderResponse(response);

      await expect(
        cancelOrder(secureClient, { orderId: acceptedResponse.orderId }),
      ).resolves.toEqual(
        expect.objectContaining({
          canceled: expect.arrayContaining([acceptedResponse.orderId]),
        }),
      );
    });
  });
});

function expectAcceptedOrderResponse(response: unknown): AcceptedOrderResponse {
  expect(response).toEqual(expect.objectContaining({ ok: true }));

  return response as AcceptedOrderResponse;
}
