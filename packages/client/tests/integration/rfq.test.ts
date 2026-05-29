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
  executionUpdateFrame,
  QUOTE_ID,
  QUOTE_SIZE_E6,
  quoteAckFrame,
  quoteRequestFrame,
  TX_HASH,
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
              decision?: unknown;
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
              invariant(
                typeof frame.decision === 'string',
                'Expected RFQ confirmation decision.',
              );
              socket.send(JSON.stringify(confirmationAckFrame(frame.decision)));
              if (frame.decision === 'CONFIRM') {
                socket.send(JSON.stringify(executionUpdateFrame()));
              }
            }
          });
        }),
      );
    });

    it('quotes the requested size when no size is provided', async ({
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
                size_e6: QUOTE_SIZE_E6,
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

    it('quotes an explicit size', async ({ secureClientWithDepositWallet }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const ack = await event.quote({ price: 0.45, size: 0.5 });

            expect(ack).toEqual({
              rfqId: event.rfqId,
              quoteId: QUOTE_ID,
            });

            expect(outboundFrames).toContainEqual(
              expect.objectContaining({
                price_e6: 450_000,
                rfq_id: event.rfqId,
                size_e6: 500_000,
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

    it('declines confirmation requests', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            await event.quote({ price: 0.45 });
            continue;
          }

          if (event.type === 'confirmation_request') {
            const ack = await event.decline();

            expect(ack).toEqual({
              rfqId: event.rfqId,
              quoteId: event.quoteId,
            });

            expect(outboundFrames).toContainEqual(
              expect.objectContaining({
                decision: 'DECLINE',
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

    it('yields execution updates', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            await event.quote({ price: 0.45 });
            continue;
          }

          if (event.type === 'confirmation_request') {
            await event.confirm();
            continue;
          }

          if (event.type === 'execution_update') {
            expect(event).toMatchObject({
              rfqId: quoteRequestFrame().rfq_id,
              status: 'CONFIRMED',
              txHash: TX_HASH,
            });

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
