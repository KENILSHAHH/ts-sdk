import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createClient, PolymarketClient } from './PolymarketClient';

describe('PolymarketClient', () => {
  it('creates service clients for the production environment', () => {
    const client = createClient();

    expect(client.gamma).toBeInstanceOf(Object);
    expect(client.data).toBeInstanceOf(Object);
  });

  it('uses the configured service roots', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const client = new PolymarketClient({
      environment: {
        name: 'test',
        gamma: 'https://gamma.example.com',
        data: 'https://data.example.com',
      },
    });

    await client.gamma.get('markets', { schema: z.any() });
    await client.data.get('positions', { schema: z.any() });

    const [gammaRequest] = fetchSpy.mock.calls[0] ?? [];
    const [dataRequest] = fetchSpy.mock.calls[1] ?? [];

    expect(gammaRequest).toBeInstanceOf(Request);
    expect(dataRequest).toBeInstanceOf(Request);
    expect((gammaRequest as Request).url).toBe(
      'https://gamma.example.com/markets',
    );
    expect((dataRequest as Request).url).toBe(
      'https://data.example.com/positions',
    );

    fetchSpy.mockRestore();
  });
});
