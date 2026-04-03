import { describe, expect, it } from 'vitest';
import { createClient, PolymarketClient, production } from './index';

describe('createClient', () => {
  it('creates a PolymarketClient instance', () => {
    const client = createClient();

    expect(client).toBeInstanceOf(PolymarketClient);
  });

  it('uses the production Gamma API URL by default', async () => {
    let requestUrl = '';
    const client = createClient();

    const gamma = client.gamma.extend({
      fetch: async (input) => {
        requestUrl = input instanceof Request ? input.url : String(input);
        return new Response(null, { status: 200 });
      },
    });

    await gamma.get('markets');

    expect(requestUrl).toBe(`${production.gamma}/markets`);
  });
});
