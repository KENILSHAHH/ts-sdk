import {
  production,
  TimeoutError,
  TransportError,
  UserInputError,
} from '@polymarket/client';
import { invariant } from '@polymarket/types';
import { ws } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
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
let responseMode:
  | 'closeAfterConfirmation'
  | 'closeAfterQuote'
  | 'confirmationTimeout'
  | 'happy'
  | 'quoteTimeout' = 'happy';
let outboundFrames: unknown[] = [];
let connectionCount = 0;

describe('RFQ sessions', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    connectionCount = 0;
    outboundFrames = [];
    responseMode = 'happy';
  });

  afterEach(() => {
    vi.useRealTimers();
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
              if (responseMode === 'quoteTimeout') return;
              if (responseMode === 'closeAfterQuote') {
                socket.close();
                return;
              }

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
              if (responseMode === 'confirmationTimeout') return;
              if (responseMode === 'closeAfterConfirmation') {
                socket.close();
                return;
              }

              socket.send(JSON.stringify(confirmationAckFrame(frame.decision)));
              if (frame.decision === 'CONFIRM') {
                socket.send(JSON.stringify(executionUpdateFrame()));
              }
            }
          });
        }),
      );
    });

    it('authenticates with the secure client credentials', async ({
      secureClientWithDepositWallet,
    }) => {
      try {
        const session = await secureClientWithDepositWallet.openRfqSession();

        expect(outboundFrames).toContainEqual(
          expect.objectContaining({
            auth: {
              apiKey: secureClientWithDepositWallet.credentials.key,
              passphrase: secureClientWithDepositWallet.credentials.passphrase,
              secret: secureClientWithDepositWallet.credentials.secret,
            },
            type: 'auth',
          }),
        );

        await session.close();
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
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

  describe('when quote acknowledgement times out', () => {
    beforeEach(() => {
      responseMode = 'quoteTimeout';
    });

    it('rejects the quote response', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();
      vi.useFakeTimers();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const quote = event.quote({ price: 0.45 });
            const quoteRejection =
              expect(quote).rejects.toBeInstanceOf(TimeoutError);

            await vi.waitFor(() => {
              expect(outboundFrames).toContainEqual(
                expect.objectContaining({ type: 'RFQ_QUOTE' }),
              );
            });
            await vi.advanceTimersByTimeAsync(30_000);

            await quoteRejection;
            await session.close();
            break;
          }
        }
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    });
  });

  describe('when confirmation acknowledgement times out', () => {
    beforeEach(() => {
      responseMode = 'confirmationTimeout';
    });

    it('rejects the confirmation response', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();
      vi.useFakeTimers();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            await event.quote({ price: 0.45 });
            continue;
          }

          if (event.type === 'confirmation_request') {
            const confirmation = event.confirm();
            const confirmationRejection =
              expect(confirmation).rejects.toBeInstanceOf(TimeoutError);

            await vi.waitFor(() => {
              expect(outboundFrames).toContainEqual(
                expect.objectContaining({
                  type: 'RFQ_CONFIRMATION_RESPONSE',
                }),
              );
            });
            await vi.advanceTimersByTimeAsync(30_000);

            await confirmationRejection;
            await session.close();
            break;
          }
        }
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    });
  });

  describe('when the connection closes before quote acknowledgement', () => {
    beforeEach(() => {
      responseMode = 'closeAfterQuote';
    });

    it('rejects the quote response', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const quote = event.quote({ price: 0.45 });
            const quoteRejection =
              expect(quote).rejects.toBeInstanceOf(TransportError);

            await vi.waitFor(() => {
              expect(outboundFrames).toContainEqual(
                expect.objectContaining({ type: 'RFQ_QUOTE' }),
              );
            });

            await quoteRejection;
            await session.close();
            break;
          }
        }
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    });
  });

  describe('when the connection closes before confirmation acknowledgement', () => {
    beforeEach(() => {
      responseMode = 'closeAfterConfirmation';
    });

    it('rejects the confirmation response', async ({
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
            const confirmation = event.confirm();
            const confirmationRejection =
              expect(confirmation).rejects.toBeInstanceOf(TransportError);

            await vi.waitFor(() => {
              expect(outboundFrames).toContainEqual(
                expect.objectContaining({
                  type: 'RFQ_CONFIRMATION_RESPONSE',
                }),
              );
            });

            await confirmationRejection;
            await session.close();
            break;
          }
        }
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    });
  });

  describe('when quote input is invalid', () => {
    it('rejects before sending a quote response', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            await expect(event.quote({ price: 1 })).rejects.toBeInstanceOf(
              UserInputError,
            );

            expect(outboundFrames).not.toContainEqual(
              expect.objectContaining({ type: 'RFQ_QUOTE' }),
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

  describe('when opening repeated RFQ sessions', () => {
    beforeAll(() => {
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          connectionCount += 1;

          socket.addEventListener('message', (event) => {
            const frame = JSON.parse(String(event.data)) as { type?: string };

            if (frame.type === 'auth') {
              socket.send(JSON.stringify(authAckFrame()));
            }
          });
        }),
      );
    });

    it('reuses the connecting session', async ({
      secureClientWithDepositWallet,
    }) => {
      try {
        const [first, second] = await Promise.all([
          secureClientWithDepositWallet.openRfqSession(),
          secureClientWithDepositWallet.openRfqSession(),
        ]);

        expect(second).toBe(first);
        expect(connectionCount).toBe(1);

        await first.close();
      } finally {
        await secureClientWithDepositWallet.closeSubscriptions();
      }
    });
  });
});
