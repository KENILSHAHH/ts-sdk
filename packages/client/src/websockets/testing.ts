import type { WebSocketLink } from 'msw';
import type { SetupServerApi } from 'msw/node';
import { expect, vi } from 'vitest';

export type CapturedConnection = {
  close(): Promise<void>;
  send(data: unknown): Promise<void>;
};

export function collectFrames(
  server: SetupServerApi,
  link: WebSocketLink,
): unknown[] {
  const frames: unknown[] = [];

  server.use(
    link.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        frames.push(JSON.parse(String(event.data)));
      });
    }),
  );

  return frames;
}

export function captureConnection(
  server: SetupServerApi,
  link: WebSocketLink,
): CapturedConnection {
  let clientConnection:
    | { close: () => void; send: (data: string) => void }
    | undefined;

  server.use(
    link.addEventListener('connection', ({ client }) => {
      clientConnection = client;
    }),
  );

  async function getClient(): Promise<NonNullable<typeof clientConnection>> {
    await vi.waitFor(() => {
      expect(clientConnection).toBeDefined();
    });
    if (clientConnection === undefined) {
      throw new Error('Expected websocket connection.');
    }
    return clientConnection;
  }

  return {
    async close() {
      const client = await getClient();
      client.close();
    },
    async send(data) {
      const client = await getClient();
      client.send(JSON.stringify(data));
    },
  };
}

export function waitForNextEvent<TEvent>(
  handle: AsyncIterable<TEvent>,
): Promise<IteratorResult<TEvent>> {
  return handle[Symbol.asyncIterator]().next();
}
