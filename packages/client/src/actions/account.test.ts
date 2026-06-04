import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { BaseSecureClient } from '../clients';
import { ServiceClient } from '../ServiceClient';
import { listAccountTrades } from './account';

const clobRoot = 'http://localhost:4020';
const server = setupServer();

const trade = {
  id: 'trade-1',
  taker_order_id: 'order-1',
  market_id: `0x${'aa'.repeat(32)}`,
  token_id: '1',
  side: 'BUY',
  size: '1',
  fee_rate_bps: '0',
  price: '0.5',
  status: 'TRADE_STATUS_CONFIRMED',
  match_time: 1_777_996_829_000,
  last_update: 1_777_996_840_000,
  outcome: 'Yes',
  bucket_index: 7,
  owner: 'owner-1',
  maker_address: `0x${'bb'.repeat(20)}`,
  transaction_hash: `0x${'cc'.repeat(32)}`,
  maker_orders: [
    {
      order_id: 'maker-order-1',
      owner: 'owner-2',
      maker_address: `0x${'dd'.repeat(20)}`,
      matched_amount: '1',
      price: '0.5',
      fee_rate_bps: '0',
      token_id: '1',
      outcome: 'Yes',
      side: 'SELL',
    },
  ],
  trader_side: 'TAKER',
};

describe('listAccountTrades', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('uses the unified account trades endpoint with offset pagination', async () => {
    const requests: URL[] = [];
    const client = {
      secureClob: new ServiceClient({ root: clobRoot }),
    } as BaseSecureClient;

    server.use(
      http.get(`${clobRoot}/v1/account/trades`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);

        return HttpResponse.json({
          data: [trade],
          has_more: url.searchParams.get('offset') === '0',
        });
      }),
    );

    const trades = listAccountTrades(client, {
      market: trade.market_id,
      tokenId: trade.token_id,
    });
    const firstPage = await trades.firstPage();
    const secondPage = await trades.from(firstPage.nextCursor).firstPage();

    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.hasMore).toBe(false);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.pathname).toBe('/v1/account/trades');
    expect(requests[0]?.searchParams.get('market_id')).toBe(trade.market_id);
    expect(requests[0]?.searchParams.get('token_id')).toBe(trade.token_id);
    expect(requests[0]?.searchParams.get('offset')).toBe('0');
    expect(requests[1]?.searchParams.get('offset')).toBe('300');
  });
});
