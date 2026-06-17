import { RequestRejectedError } from '@polymarket/client';
import { describe, expect, it, runMeteredTests } from './fixtures';

describe('Perps integration', () => {
  it.runIf(runMeteredTests)(
    'creates delegated Perps credentials',
    async ({ secureClientWithDepositWallet }) => {
      const session = await secureClientWithDepositWallet.openPerpsSession({
        expiresIn: 30 * 60_000,
      });

      expect(session.credentials.proxy).toMatch(/^0x[0-9a-f]{40}$/i);
      expect(session.credentials.privateKey).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(session.credentials.secret).toEqual(expect.any(String));
      expect(session.credentials.expiresAt).toBeGreaterThan(Date.now());

      await session.close();
    },
  );

  it.runIf(runMeteredTests)(
    'resumes existing delegated Perps credentials',
    async ({ secureClientWithDepositWallet }) => {
      const initialSession =
        await secureClientWithDepositWallet.openPerpsSession({
          expiresIn: 30 * 60_000,
        });

      try {
        const resumedSession =
          await secureClientWithDepositWallet.openPerpsSession({
            credentials: initialSession.credentials,
          });

        expect(resumedSession.credentials).toEqual(initialSession.credentials);

        await resumedSession.close();
      } finally {
        await initialSession.close();
      }
    },
  );

  it.runIf(runMeteredTests)(
    'rejects delegated Perps credentials with an invalid secret',
    async ({ secureClientWithDepositWallet }) => {
      const session = await secureClientWithDepositWallet.openPerpsSession({
        expiresIn: 30 * 60_000,
      });

      try {
        await expect(
          secureClientWithDepositWallet.openPerpsSession({
            credentials: {
              ...session.credentials,
              secret: 'invalid-secret',
            },
          }),
        ).rejects.toBeInstanceOf(RequestRejectedError);
      } finally {
        await session.close();
      }
    },
  );
});
