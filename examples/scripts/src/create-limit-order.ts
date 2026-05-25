import { createSecureClient, OrderSide } from '@polymarket/client';
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
const minimumTickSize =
  market.trading.minimumTickSize ?? never('No minimum tick size found');
const minimumOrderSize =
  market.trading.minimumOrderSize ?? never('No minimum order size found');

const order = await secureClient.createLimitOrder({
  tokenId,
  side: OrderSide.BUY,
  price: minimumTickSize,
  size: minimumOrderSize,
});

console.table({
  market: market?.question ?? market?.slug ?? market?.id ?? never(),
  minimumTickSize,
  minimumOrderSize,
  tokenId: order.tokenId,
  side: order.side,
  orderType: order.orderType,
  maker: order.maker,
  makerAmount: order.makerAmount,
  takerAmount: order.takerAmount,
});
