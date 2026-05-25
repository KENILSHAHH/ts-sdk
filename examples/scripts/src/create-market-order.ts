import { createSecureClient, OrderSide, OrderType } from '@polymarket/client';
import { privateKey } from '@polymarket/client/viem';
import { never } from './lib/assert';
import { requireEnv } from './lib/env';
import { findOrderExampleMarket } from './lib/markets';

const secureClient = await createSecureClient({
  wallet: requireEnv('POLYMARKET_DEPOSIT_WALLET'),
  signer: privateKey(requireEnv('POLYMARKET_PRIVATE_KEY')),
});

const market = await findOrderExampleMarket(secureClient);
const tokenId =
  market?.outcomes.yes.tokenId ?? never('No YES token found for market');
const minimumOrderSize =
  market.trading.minimumOrderSize ?? never('No minimum order size found');

const estimatedPrice = await secureClient.estimateMarketPrice({
  tokenId,
  side: OrderSide.BUY,
  amount: minimumOrderSize,
  orderType: OrderType.FAK,
});

const order = await secureClient.createMarketOrder({
  tokenId,
  side: OrderSide.BUY,
  amount: minimumOrderSize,
  orderType: OrderType.FAK,
});

console.table({
  market: market?.question ?? market?.slug ?? market?.id ?? never(),
  minimumOrderSize,
  tokenId: order.tokenId,
  side: order.side,
  orderType: order.orderType,
  estimatedPrice,
  maker: order.maker,
  makerAmount: order.makerAmount,
  takerAmount: order.takerAmount,
});
