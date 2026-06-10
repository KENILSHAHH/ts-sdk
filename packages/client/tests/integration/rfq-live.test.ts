import { RfqExecutionStatus } from '@polymarket/client';
import { describe, expect, it, runMeteredTests } from './fixtures';

describe('RFQ live quoting integration', () => {
  // Metered: an accepted quote can execute a live trade with real funds.
  it.runIf(runMeteredTests)(
    'quotes live RFQ requests until one executes',
    { timeout: 180_000 },
    async ({ secureClientWithDepositWallet }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          console.log(event);
          if (event.type === 'quote_request') {
            await event.quote({ price: 0.5, size: 0.001 });
            continue;
          }

          if (
            event.type === 'execution_update' &&
            event.status === RfqExecutionStatus.Confirmed
          ) {
            expect(event.txHash).toBeDefined();
            await session.close();
            return;
          }
        }

        throw new Error('RFQ session ended without a confirmed execution.');
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    },
  );
});
