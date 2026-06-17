import {
  type PerpsCredentials,
  PerpsTimeInForce,
} from '@polymarket/bindings/perps';
import { expectEvmAddress, expectPrivateKey } from '@polymarket/types';
import { ws } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { production } from '../../environments';
import { ServiceClient } from '../../ServiceClient';
import { captureConnection, waitForNextEvent } from '../testing';
import { PerpsSession } from './session';

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

describe('PerpsSession', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
  });

  afterAll(() => {
    server.close();
  });

  describe('successful session', () => {
    let frames: unknown[];

    beforeEach(() => {
      frames = mockSuccessfulSession();
    });

    it('authenticates and subscribes to session channels', async () => {
      const session = createSession();

      await session.connect();

      expect(frames).toEqual([
        {
          id: 1,
          op: {
            args: {
              proxy: credentials.proxy,
              secret: credentials.secret,
            },
            type: 'auth',
          },
          req: 'post',
        },
        {
          id: 2,
          req: 'sub',
          chs: [
            'balances',
            'portfolio',
            'orders',
            'fills',
            'funding',
            'deposits',
            'withdrawals',
          ],
        },
      ]);

      await session.close();
    });

    it('deduplicates balance ticks and emits resync on sequence gaps', async () => {
      const connection = captureConnection(server, perps);
      const session = createSession();

      await session.connect();

      const firstEvent = waitForNextEvent(session);
      await connection.send(balanceUpdate({ balance: '1', sequence: 1 }));
      await expect(firstEvent).resolves.toMatchObject({
        done: false,
        value: {
          channel: 'balances',
          payload: { asset: 'USDC', balance: '1', value: '1' },
          sequence: 1,
          type: 'balance',
        },
      });

      const nextEvent = waitForNextEvent(session);
      await connection.send(balanceUpdate({ balance: '1', sequence: 2 }));
      await connection.send(balanceUpdate({ balance: '2', sequence: 4 }));

      await expect(nextEvent).resolves.toMatchObject({
        done: false,
        value: {
          channel: 'balances',
          previousSequence: 1,
          reason: 'sequence_gap',
          sequence: 4,
          type: 'resync',
        },
      });
      await expect(waitForNextEvent(session)).resolves.toMatchObject({
        done: false,
        value: {
          channel: 'balances',
          payload: { asset: 'USDC', balance: '2', value: '2' },
          sequence: 4,
          type: 'balance',
        },
      });

      await session.close();
    });
  });

  describe('reconnects', () => {
    let connectionFrames: Array<{
      client: { close: () => void };
      frames: unknown[];
    }>;

    beforeEach(() => {
      connectionFrames = mockSuccessfulSessions();
    });

    it('reauthenticates, resubscribes, and emits resync', async () => {
      const session = createSession();

      vi.useFakeTimers();

      try {
        await session.connect();
        await vi.waitFor(() => {
          expect(connectionFrames[0]?.frames).toHaveLength(2);
        });

        const nextEvent = waitForNextEvent(session);
        connectionFrames[0]?.client.close();
        await vi.advanceTimersToNextTimerAsync();

        await vi.waitFor(() => {
          expect(connectionFrames[1]?.frames).toEqual([
            {
              id: 3,
              op: {
                args: {
                  proxy: credentials.proxy,
                  secret: credentials.secret,
                },
                type: 'auth',
              },
              req: 'post',
            },
            {
              id: 4,
              req: 'sub',
              chs: [
                'balances',
                'portfolio',
                'orders',
                'fills',
                'funding',
                'deposits',
                'withdrawals',
              ],
            },
          ]);
        });
        await expect(nextEvent).resolves.toMatchObject({
          done: false,
          value: {
            reason: 'reconnect',
            type: 'resync',
          },
        });
      } finally {
        await session.close();
      }
    });
  });

  describe('commands', () => {
    let frames: unknown[];

    beforeEach(() => {
      frames = mockCommandSession();
    });

    it('places signed orders over the session socket', async () => {
      const session = createSession();
      await session.connect();

      const [ack] = await session.placeOrders({
        orders: [
          {
            buy: true,
            clientOrderId: '0123456789abcdef0123456789abcdef',
            instrumentId: 1,
            postOnly: false,
            price: '100.00',
            quantity: '1.5',
            timeInForce: PerpsTimeInForce.Gtc,
          },
        ],
      });

      expect(ack).toMatchObject({
        clientOrderId: '0123456789abcdef0123456789abcdef',
        orderId: 123,
        status: 'ok',
      });
      expect(frames[2]).toMatchObject({
        id: 3,
        op: {
          args: [
            {
              buy: true,
              c: '0123456789abcdef0123456789abcdef',
              iid: 1,
              p: '100.00',
              po: false,
              qty: '1.5',
              tif: 'gtc',
            },
          ],
          type: 'createOrders',
        },
        req: 'post',
        salt: expect.any(Number),
        sig: expect.stringMatching(/^0x[0-9a-f]{130}$/),
        ts: expect.any(Number),
      });

      await session.close();
    });

    it('updates leverage over the session socket', async () => {
      const session = createSession();
      await session.connect();

      await expect(
        session.updateLeverage({
          crossMargin: false,
          instrumentId: 1,
          leverage: 5,
        }),
      ).resolves.toEqual({ status: 'ok' });
      expect(frames[2]).toMatchObject({
        id: 3,
        op: {
          args: {
            cross: false,
            iid: 1,
            lev: 5,
          },
          type: 'updateLeverage',
        },
        req: 'post',
        salt: expect.any(Number),
        sig: expect.stringMatching(/^0x[0-9a-f]{130}$/),
        ts: expect.any(Number),
      });

      await session.close();
    });

    it('cancels a single order by client order id', async () => {
      const session = createSession();
      await session.connect();

      await expect(
        session.cancelOrder({
          clientOrderId: '0123456789abcdef0123456789abcdef',
        }),
      ).resolves.toEqual({ status: 'ok' });
      expect(frames[2]).toMatchObject({
        id: 3,
        op: {
          args: ['0123456789abcdef0123456789abcdef'],
          type: 'cancelOrdersCOID',
        },
        req: 'post',
        salt: expect.any(Number),
        sig: expect.stringMatching(/^0x[0-9a-f]{130}$/),
        ts: expect.any(Number),
      });

      await session.close();
    });
  });
});

function createSession(): PerpsSession {
  return new PerpsSession({
    api,
    chainId: production.chainId,
    credentials,
    onClose: () => undefined,
    url: production.perpsWs,
  });
}

function mockCommandSession(): unknown[] {
  const frames: unknown[] = [];

  server.use(
    perps.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        const frame = JSON.parse(String(event.data));
        frames.push(frame);
        client.send(
          JSON.stringify({
            id: frame.id,
            data: responseForFrame(frame),
          }),
        );
      });
    }),
  );

  return frames;
}

function responseForFrame(frame: { op?: { type?: string }; req?: string }) {
  if (frame.req === 'sub') return [{ status: 'ok' }];
  switch (frame.op?.type) {
    case 'auth':
      return { status: 'ok' };
    case 'createOrders':
      return [
        {
          coid: '0123456789abcdef0123456789abcdef',
          oid: 123,
          status: 'ok',
        },
      ];
    case 'updateLeverage':
      return { status: 'ok' };
    default:
      return [{ status: 'ok' }];
  }
}

function mockSuccessfulSession(): unknown[] {
  const frames: unknown[] = [];

  server.use(
    perps.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        const frame = JSON.parse(String(event.data));
        frames.push(frame);
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

  return frames;
}

function mockSuccessfulSessions(): Array<{
  client: { close: () => void };
  frames: unknown[];
}> {
  const connections: Array<{
    client: { close: () => void };
    frames: unknown[];
  }> = [];

  server.use(
    perps.addEventListener('connection', ({ client }) => {
      const frames: unknown[] = [];
      connections.push({ client, frames });
      client.addEventListener('message', (event) => {
        const frame = JSON.parse(String(event.data));
        frames.push(frame);
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

  return connections;
}

function balanceUpdate(request: { balance: string; sequence: number }) {
  return {
    ch: 'balances',
    data: {
      asset: 'USDC',
      balance: request.balance,
      value: request.balance,
    },
    sq: request.sequence,
    ts: 1_700_000_000_000,
  };
}
