import {
  production,
  SignatureType,
  TimeoutError,
  TransportError,
  UserInputError,
} from '@polymarket/client';
import { ws } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { describe, expect, it } from './fixtures';
import {
  authAckMessage,
  confirmationAckMessage,
  confirmationDecision,
  confirmationRequestMessage,
  executionUpdateMessage,
  type OutboundFrame,
  QUOTE_ID,
  QUOTE_SIZE_E6,
  quoteAckMessage,
  quoteAmounts,
  quoteRequestMessage,
  RFQ_ID,
  recordOutboundFrame,
  rfqErrorMessage,
  TX_HASH,
} from './rfq-frames';

const rfq = ws.link(production.rfqQuoterWs);
const server = setupServer();
let outboundFrames: OutboundFrame[] = [];
let connectionCount = 0;

describe('RFQ sessions', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    connectionCount = 0;
    outboundFrames = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    server.close();
  });

  describe('when the server completes the happy-path quoter flow', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              const quote = quoteAmounts(frame);
              socket.send(quoteAckMessage());
              socket.send(
                confirmationRequestMessage(quote.priceE6, quote.sizeE6),
              );
              return;
            }

            if (frame.type === 'RFQ_CONFIRMATION_RESPONSE') {
              const decision = confirmationDecision(frame);
              socket.send(confirmationAckMessage(decision));
              if (decision === 'CONFIRM') {
                socket.send(executionUpdateMessage());
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
            identity: {
              maker_address: secureClientWithDepositWallet.account.wallet,
              signature_type: SignatureType.POLY_1271,
              signer_address: secureClientWithDepositWallet.account.wallet,
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
                signed_order: expect.objectContaining({
                  makerAmount: '550000',
                  maker: secureClientWithDepositWallet.account.wallet,
                  side: 0,
                  signatureType: SignatureType.POLY_1271,
                  signer: secureClientWithDepositWallet.account.wallet,
                  takerAmount: '1000000',
                  tokenId: event.noPositionId,
                }),
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

    it('quotes from inventory for buy requests', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const ack = await event.quote({ price: 0.45, source: 'inventory' });

            expect(ack).toEqual({
              rfqId: event.rfqId,
              quoteId: QUOTE_ID,
            });

            expect(outboundFrames).toContainEqual(
              expect.objectContaining({
                price_e6: 450_000,
                rfq_id: event.rfqId,
                signed_order: expect.objectContaining({
                  makerAmount: '1000000',
                  side: 1,
                  takerAmount: '450000',
                  tokenId: event.yesPositionId,
                }),
                size_e6: QUOTE_SIZE_E6,
                type: 'RFQ_QUOTE',
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
              rfqId: RFQ_ID,
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

  describe('when the RFQ request direction is sell', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage({ direction: 'SELL' }));
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              quoteAmounts(frame);
              socket.send(quoteAckMessage());
            }
          });
        }),
      );
    });

    it('quotes from inventory', async ({ secureClientWithDepositWallet }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const ack = await event.quote({ price: 0.45, source: 'inventory' });

            expect(ack).toEqual({
              rfqId: event.rfqId,
              quoteId: QUOTE_ID,
            });

            expect(outboundFrames).toContainEqual(
              expect.objectContaining({
                price_e6: 450_000,
                rfq_id: event.rfqId,
                signed_order: expect.objectContaining({
                  makerAmount: '1000000',
                  side: 1,
                  takerAmount: '550000',
                  tokenId: event.noPositionId,
                }),
                size_e6: QUOTE_SIZE_E6,
                type: 'RFQ_QUOTE',
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

  describe('when quote acknowledgement times out', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              quoteAmounts(frame);
            }
          });
        }),
      );
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

  describe('when the server rejects a quote response', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              quoteAmounts(frame);
              socket.send(
                rfqErrorMessage({
                  code: 'INVALID_QUOTE',
                  error: 'invalid quote',
                  requestType: 'RFQ_QUOTE',
                  rfqId: RFQ_ID,
                }),
              );
            }
          });
        }),
      );
    });

    it('rejects the quote response with the correlated RFQ error', async ({
      secureClientWithDepositWallet,
    }) => {
      const session = await secureClientWithDepositWallet.openRfqSession();

      try {
        for await (const event of session) {
          if (event.type === 'quote_request') {
            const quote = event.quote({ price: 0.45 });

            await expect(quote).rejects.toMatchObject({
              code: 'INVALID_QUOTE',
              message: 'invalid quote',
              name: 'RfqQuoteRejectedError',
              rfqId: event.rfqId,
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

  describe('when confirmation acknowledgement times out', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              const quote = quoteAmounts(frame);
              socket.send(quoteAckMessage());
              socket.send(
                confirmationRequestMessage(quote.priceE6, quote.sizeE6),
              );
              return;
            }

            if (frame.type === 'RFQ_CONFIRMATION_RESPONSE') {
              confirmationDecision(frame);
            }
          });
        }),
      );
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

  describe('when the server rejects a confirmation response', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              const quote = quoteAmounts(frame);
              socket.send(quoteAckMessage());
              socket.send(
                confirmationRequestMessage(quote.priceE6, quote.sizeE6),
              );
              return;
            }

            if (frame.type === 'RFQ_CONFIRMATION_RESPONSE') {
              confirmationDecision(frame);
              socket.send(
                rfqErrorMessage({
                  code: 'INVALID_CONFIRMATION',
                  error: 'invalid confirmation',
                  quoteId: QUOTE_ID,
                  requestType: 'RFQ_CONFIRMATION_RESPONSE',
                  rfqId: RFQ_ID,
                }),
              );
            }
          });
        }),
      );
    });

    it('rejects the confirmation response with the correlated RFQ error', async ({
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

            await expect(confirmation).rejects.toMatchObject({
              code: 'INVALID_CONFIRMATION',
              message: 'invalid confirmation',
              name: 'RfqConfirmationRejectedError',
              quoteId: event.quoteId,
              rfqId: event.rfqId,
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

  describe('when the connection closes before quote acknowledgement', () => {
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              quoteAmounts(frame);
              socket.close();
            }
          });
        }),
      );
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
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
              return;
            }

            if (frame.type === 'RFQ_QUOTE') {
              const quote = quoteAmounts(frame);
              socket.send(quoteAckMessage());
              socket.send(
                confirmationRequestMessage(quote.priceE6, quote.sizeE6),
              );
              return;
            }

            if (frame.type === 'RFQ_CONFIRMATION_RESPONSE') {
              confirmationDecision(frame);
              socket.close();
            }
          });
        }),
      );
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
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
              socket.send(quoteRequestMessage());
            }
          });
        }),
      );
    });

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
    beforeEach(() => {
      server.resetHandlers();
      server.use(
        rfq.addEventListener('connection', ({ client: socket }) => {
          connectionCount += 1;

          socket.addEventListener('message', (event) => {
            const frame = recordOutboundFrame(event.data, outboundFrames);

            if (frame.type === 'auth') {
              socket.send(authAckMessage());
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
