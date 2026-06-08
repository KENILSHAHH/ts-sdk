import type { Market, PublicClient } from '@polymarket/client';

type MarketLookupClient = Pick<PublicClient, 'fetchOrderBook' | 'listMarkets'>;

export async function findOrderExampleMarket(
  client: MarketLookupClient,
): Promise<Market> {
  const paginator = client.listMarkets({
    closed: false,
    liquidityNumMin: 1000,
    pageSize: 1000,
    order: 'liquidityNum',
    ascending: false,
    sportsMarketTypes: ['moneyline', 'spreads', 'totals'],
  });

  for await (const page of paginator) {
    for (const candidate of page.items) {
      if (await isOrderExampleCandidate(client, candidate)) {
        return candidate;
      }
    }
  }

  throw new Error('Could not find a live market for the order example');
}

async function isOrderExampleCandidate(
  client: MarketLookupClient,
  candidate: Market,
) {
  const tokenId = candidate.outcomes.yes.tokenId;

  if (
    candidate.state.enableOrderBook !== true ||
    candidate.state.acceptingOrders === false ||
    candidate.trading.minimumOrderSize === null ||
    candidate.trading.minimumOrderSize === undefined ||
    candidate.trading.minimumTickSize === null ||
    candidate.trading.minimumTickSize === undefined ||
    tokenId === null ||
    candidate.prices.bestAsk === null ||
    candidate.prices.bestAsk === undefined ||
    Number(candidate.prices.bestAsk) >= 1 ||
    candidate.prices.bestBid === null ||
    candidate.prices.bestBid === undefined ||
    Number(candidate.prices.bestBid) <= 0 ||
    Number(
      candidate.metrics.liquidityClob ?? candidate.metrics.liquidityNum ?? 0,
    ) <= 0
  ) {
    return false;
  }

  try {
    const book = await client.fetchOrderBook({ tokenId });

    return book.asks.length > 0 && book.bids.length > 0;
  } catch {
    return false;
  }
}
