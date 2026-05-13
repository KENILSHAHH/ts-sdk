import { ApiKeyCredsSchema } from '@polymarket/bindings/clob';
import {
  InvariantError,
  type EvmAddress,
  type EvmSignature,
} from '@polymarket/types';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { fetchApiKeys } from './actions/auth';
import { createSecureClient, type SecureClient } from './clients';
import { production } from './environments';
import type { Signer } from './types';
import type { SecureWebSocketManagers } from './websockets';

const clob = 'http://localhost:4012';
const signerAddress =
  '0x0000000000000000000000000000000000000001' as EvmAddress;
const signature = `0x${'00'.repeat(65)}` as EvmSignature;
const credentials = ApiKeyCredsSchema.parse({
  apiKey: 'test-key',
  passphrase: 'test-passphrase',
  secret: 'test-secret',
});
const environment = {
  ...production,
  clob,
};
const signer: Signer = {
  getAddress: async () => signerAddress,
  sendTransaction: async () => ({
    transactionHash: null,
    transactionId: null,
    wait: async () => ({ transactionHash: null, transactionId: null }),
  }),
  signMessage: async () => signature,
  signTypedData: async () => signature,
};
const server = setupServer();

type ClientWithWebSockets = SecureClient & {
  readonly webSockets: SecureWebSocketManagers;
};

describe('SecureClient', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('endAuthentication', () => {
    it('revokes credentials and invalidates the client when subscription close rejects', async () => {
      let deleted = false;
      server.use(
        http.get(`${clob}/auth/api-keys`, () =>
          HttpResponse.json({ apiKeys: [credentials.key] }),
        ),
        http.delete(`${clob}/auth/api-key`, () => {
          deleted = true;
          return HttpResponse.json('OK');
        }),
      );
      const secureClient = (await createSecureClient({
        credentials,
        environment,
        signer,
      })) as ClientWithWebSockets;

      secureClient.webSockets.clobMarket.close = vi
        .fn()
        .mockResolvedValue(undefined);
      secureClient.webSockets.rtds.close = vi.fn().mockResolvedValue(undefined);
      secureClient.webSockets.sports.close = vi
        .fn()
        .mockResolvedValue(undefined);
      secureClient.webSockets.clobUser.close = vi
        .fn()
        .mockRejectedValue(new Error('close failed'));

      const publicClient = await secureClient.endAuthentication();

      expect(deleted).toBe(true);
      expect(publicClient.isPublicClient()).toBe(true);
      await expect(fetchApiKeys(secureClient)).rejects.toBeInstanceOf(
        InvariantError,
      );
    });
  });
});
