import type { PerpsCredentials } from '@polymarket/bindings/perps';
import { expectEvmAddress, expectPrivateKey } from '@polymarket/types';
import { ws } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { production } from '../../environments';
import { ServiceClient } from '../../ServiceClient';
import { PerpsSessionManager } from './manager';

const perps = ws.link(production.perpsWs);
const server = setupServer();
const api = new ServiceClient({ root: production.perpsApi });

const credentials = {
  expiresAt: Date.now() + 30 * 60_000,
  privateKey: expectPrivateKey(
    '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ),
  proxy: expectEvmAddress('0x0000000000000000000000000000000000000001'),
  secret: 'secret',
} satisfies PerpsCredentials;

describe('PerpsSessionManager', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
    mockSuccessfulSession();
  });

  afterAll(() => {
    server.close();
  });

  it('connects sessions through the manager lifecycle', async () => {
    const manager = new PerpsSessionManager({
      api,
      chainId: production.chainId,
      url: production.perpsWs,
    });
    const session = await manager.connect(credentials);

    expect(session.credentials).toBe(credentials);

    await manager.close();
    expect(session.closed).toBe(true);
  });
});

function mockSuccessfulSession(): void {
  server.use(
    perps.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        const frame = JSON.parse(String(event.data));
        const data =
          frame.req === 'sub' ? [{ status: 'ok' }] : { status: 'ok' };
        client.send(
          JSON.stringify({
            id: frame.id,
            data,
          }),
        );
      });
    }),
  );
}
