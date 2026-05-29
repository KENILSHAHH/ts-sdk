import { production } from '@polymarket/client';
import { invariant } from '@polymarket/types';
import { ws } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { describe, expect, it } from './fixtures';
import {
  authAckFrame,
  confirmationAckFrame,
  confirmationRequestFrame,
  QUOTE_ID,
  quoteAckFrame,
  quoteRequestFrame,
} from './rfq-frames';

const rfq = ws.link(production.rfqQuoterWs);
const server = setupServer();
let outboundFrames: unknown[] = [];

describe('RFQ sessions', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    outboundFrames = [];
  });

  afterAll(() => {
    server.close();
  });

  describe('when the server completes the happy-path quoter flow', () => {
    beforeAll(() => {
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = JSON.parse(String(event.data)) as {
              price_e6?: unknown;
              size_e6?: unknown;
              type?: string;
            };
            outboundFrames.push(frame);

            if (frame.type === 'auth') {
              socket.send(JSON.stringify(authAckFrame()));
              socket.send(JSON.stringify(quoteRequestFrame()));
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              invariant(
                typeof frame.price_e6 === 'number',
                'Expected RFQ quote price.',
              );
              invariant(
                typeof frame.size_e6 === 'number',
                'Expected RFQ quote size.',
              );
              socket.send(JSON.stringify(quoteAckFrame()));
              socket.send(
                JSON.stringify(
                  confirmationRequestFrame(frame.price_e6, frame.size_e6),
                ),
              );
              return;
            }

            if (frame.type === 'RFQ_CONFIRMATION_RESPONSE') {
              socket.send(JSON.stringify(confirmationAckFrame()));
            }
          });
        }),
      );
    });

    it('quotes and confirms through the secure client session', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const ack = await event.quote({ price: 0.45 });

            expect(ack).toEqual({
              rfqId: event.rfqId,
              quoteId: QUOTE_ID,
            });

            expect(outboundFrames).toContainEqual(
              expect.objectContaining({
                price_e6: 450_000,
                rfq_id: event.rfqId,
                size_e6: 1_000_000,
                type: 'RFQ_QUOTE',
              }),
            );

            continue;
          }

          if (event.type === 'confirmation_request') {
            const ack = await event.confirm();

            expect(ack).toEqual({
              rfqId: event.rfqId,
              quoteId: event.quoteId,
            });

            expect(outboundFrames).toContainEqual(
              expect.objectContaining({
                decision: 'CONFIRM',
                quote_id: event.quoteId,
                rfq_id: event.rfqId,
                type: 'RFQ_CONFIRMATION_RESPONSE',
              }),
            );

            await session.close();
            break;
          }
        }
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    });
  });
});
