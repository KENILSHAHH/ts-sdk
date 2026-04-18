// biome-ignore-all lint/style/noRestrictedImports: msw's Node test server lives at this entrypoint.

import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { remoteBuilderSigning } from './authorization';
import { createPublicClient } from './clients';
import { RequestRejectedError, SigningError } from './errors';
import { buildHmacSignature } from './hmac';
import { builderCredentials } from './testing';

const signerUrl = 'http://localhost:4010/api/builder/sign';

const server = setupServer();

describe('authorization', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('remoteBuilderSigning', () => {
    it('authorizes live builder-authenticated requests with remotely signed headers', async () => {
      server.use(
        http.post(signerUrl, async ({ request }) => {
          expect(request.headers.get('content-type')).toBe('application/json');
          expect(request.headers.get('x-remote-auth')).toBe('test-auth');

          const payload = (await request.json()) as {
            body?: string;
            method: 'DELETE' | 'GET' | 'POST';
            path: string;
          };

          expect(payload).toEqual({
            body: undefined,
            method: 'GET',
            path: '/builder/trades',
          });

          const timestamp = Math.floor(Date.now() / 1000);

          return HttpResponse.json({
            POLY_BUILDER_API_KEY: builderCredentials.key,
            POLY_BUILDER_PASSPHRASE: builderCredentials.passphrase,
            POLY_BUILDER_SIGNATURE: await buildHmacSignature(
              builderCredentials.secret,
              timestamp,
              payload.method,
              payload.path,
              payload.body,
            ),
            POLY_BUILDER_TIMESTAMP: `${timestamp}`,
          });
        }),
      );
      const client = createPublicClient({
        apiKey: remoteBuilderSigning({
          headers: async () => ({
            'x-remote-auth': 'test-auth',
          }),
          url: signerUrl,
        }),
      });

      await expect(client.listBuilderTrades().first()).resolves.toBeDefined();
    });

    it('fails without builder authorization because the live CLOB endpoint returns 401', async () => {
      const client = createPublicClient();

      await expect(client.listBuilderTrades().first()).rejects.toBeInstanceOf(
        RequestRejectedError,
      );
    });

    it('fails when the remote signer returns invalid builder headers because the live CLOB endpoint returns 401', async () => {
      server.use(
        http.post(signerUrl, () =>
          HttpResponse.json({
            POLY_BUILDER_API_KEY: 'invalid',
            POLY_BUILDER_PASSPHRASE: 'invalid',
            POLY_BUILDER_SIGNATURE: 'invalid',
            POLY_BUILDER_TIMESTAMP: '1',
          }),
        ),
      );
      const client = createPublicClient({
        apiKey: remoteBuilderSigning({ url: signerUrl }),
      });

      await expect(client.listBuilderTrades().first()).rejects.toBeInstanceOf(
        RequestRejectedError,
      );
    });

    it('throws SigningError when the remote signer rejects the request', async () => {
      server.use(
        http.post(
          signerUrl,
          () => new HttpResponse('forbidden', { status: 403 }),
        ),
      );
      const authorization = remoteBuilderSigning({ url: signerUrl });

      await expect(
        authorization.authorize({ method: 'GET', path: '/builder/trades' }),
      ).rejects.toBeInstanceOf(SigningError);
    });

    it('throws SigningError when the remote signer returns an invalid payload', async () => {
      server.use(
        http.post(signerUrl, () =>
          HttpResponse.json({ POLY_BUILDER_API_KEY: 'builder-key' }),
        ),
      );
      const authorization = remoteBuilderSigning({ url: signerUrl });

      await expect(
        authorization.authorize({ method: 'GET', path: '/builder/trades' }),
      ).rejects.toBeInstanceOf(SigningError);
    });
  });
});
