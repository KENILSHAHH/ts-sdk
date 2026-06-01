import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import {
  type RfqConfirmationDecision,
  type RfqId,
  type RfqQuoteId,
  type RfqQuoteRequest,
  RfqQuoterInboundMessageSchema,
  type RfqQuoterOutboundMessage,
} from '@polymarket/bindings/rfq';
import { type EvmAddress, setNonBlockingTimeout } from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import type {
  RfqConfirmationAck,
  RfqEvent,
  RfqQuoteAck,
  RfqQuoteResponse,
  RfqSession,
} from '../../actions/rfq';
import { TransportError, UserInputError } from '../../errors';
import type { Signer } from '../../types';
import type { AccountIdentity } from '../../wallet';
import { WebSocketConnection } from '../lifecycle';
import {
  type RfqEventController,
  toConfirmationAck,
  toConfirmationRequestEvent,
  toExecutionUpdateEvent,
  toQuoteAck,
  toQuoteRequestEvent,
} from './events';
import {
  createAuthMessage,
  createConfirmationResponseMessage,
  createQuoteMessage,
} from './messages';
import { PendingResponses } from './pending';
import { createRfqQuote } from './quote';

const AUTH_TIMEOUT_MS = 30_000;
const ACK_TIMEOUT_MS = 30_000;

export type RfqQuoterWebSocketManagerOptions = {
  account: AccountIdentity;
  chainId: number;
  credentials: ApiKeyCreds;
  exchange: EvmAddress;
  signer?: Signer;
  url: string;
};

export class RfqQuoterWebSocketManager {
  readonly #account: AccountIdentity;
  readonly #chainId: number;
  readonly #credentials: ApiKeyCreds;
  readonly #exchange: EvmAddress;
  readonly #signer: Signer | undefined;
  readonly #url: string;
  #session: RfqWebSocketSession | undefined;
  #connectingSession: RfqWebSocketSession | undefined;
  #connecting: Promise<RfqSession> | undefined;

  constructor(options: RfqQuoterWebSocketManagerOptions) {
    this.#account = options.account;
    this.#chainId = options.chainId;
    this.#credentials = options.credentials;
    this.#exchange = options.exchange;
    this.#signer = options.signer;
    this.#url = options.url;
  }

  async connect(): Promise<RfqSession> {
    if (this.#session !== undefined) return this.#session;
    if (this.#connecting !== undefined) return this.#connecting;
    if (this.#signer === undefined) {
      throw new UserInputError(
        'RFQ quoter sessions require a signer. Create a secure client with a signer to use openRfqSession().',
      );
    }

    const session = new RfqWebSocketSession({
      account: this.#account,
      chainId: this.#chainId,
      credentials: this.#credentials,
      exchange: this.#exchange,
      onClose: () => this.#clearSession(session),
      signer: this.#signer,
      url: this.#url,
    });
    this.#connectingSession = session;

    let connecting!: Promise<RfqSession>;
    connecting = (async () => {
      try {
        await session.connect();
        this.#session = session;
        return session;
      } catch (error) {
        await session.close();
        throw error;
      } finally {
        if (this.#connecting === connecting) {
          this.#connecting = undefined;
        }
        if (this.#connectingSession === session) {
          this.#connectingSession = undefined;
        }
      }
    })();

    this.#connecting = connecting;
    return connecting;
  }

  async close(): Promise<void> {
    const session = this.#session;
    const connectingSession = this.#connectingSession;
    const connecting = this.#connecting;

    this.#session = undefined;
    this.#connectingSession = undefined;
    this.#connecting = undefined;

    await Promise.allSettled([
      session?.close(),
      connectingSession?.close(),
      connecting?.catch(() => undefined),
    ]).then(() => undefined);
  }

  #clearSession(session: RfqWebSocketSession): void {
    if (this.#session === session) {
      this.#session = undefined;
    }
    if (this.#connectingSession === session) {
      this.#connectingSession = undefined;
    }
  }
}

type RfqWebSocketSessionConfig = {
  account: AccountIdentity;
  chainId: number;
  credentials: ApiKeyCreds;
  exchange: EvmAddress;
  onClose: () => void;
  signer: Signer;
  url: string;
};

class RfqWebSocketSession implements RfqSession, RfqEventController {
  readonly #account: AccountIdentity;
  readonly #chainId: number;
  readonly #credentials: ApiKeyCreds;
  readonly #exchange: EvmAddress;
  readonly #onClose: () => void;
  readonly #signer: Signer;
  readonly #url: string;
  readonly #connection = new WebSocketConnection();
  readonly #queue: Pushable<RfqEvent> = pushable({ objectMode: true });
  readonly #pending = new PendingResponses(ACK_TIMEOUT_MS);
  #closing: Promise<void> | undefined;
  #auth: PendingResponse<void> | undefined;

  constructor(options: RfqWebSocketSessionConfig) {
    this.#account = options.account;
    this.#chainId = options.chainId;
    this.#credentials = options.credentials;
    this.#exchange = options.exchange;
    this.#onClose = options.onClose;
    this.#signer = options.signer;
    this.#url = options.url;
  }

  async connect(): Promise<void> {
    const auth = createPending<void>();
    this.#auth = auth;
    const authTimeout = setNonBlockingTimeout(() => {
      auth.reject(new TransportError('RFQ quoter authentication timed out.'));
    }, AUTH_TIMEOUT_MS);

    try {
      await this.#connection.connect({
        onClose: () => this.#handleClose(),
        onError: () => undefined,
        onMessage: (message) => this.#handleMessage(message),
        onOpen: () => this.#sendAuthMessage(),
        url: this.#url,
      });
      await auth.promise;
    } finally {
      clearTimeout(authTimeout);
      this.#auth = undefined;
    }
  }

  async #send(message: RfqQuoterOutboundMessage): Promise<void> {
    if (!this.#connection.send(message)) {
      throw new TransportError('RFQ quoter websocket is not open.');
    }
  }

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown();
    }
    await this.#closing;
  }

  [Symbol.asyncIterator](): AsyncIterator<RfqEvent> {
    return this.#queue[Symbol.asyncIterator]();
  }

  async #shutdown(): Promise<void> {
    this.#pending.rejectAll(new TransportError('RFQ quoter websocket closed.'));
    this.#queue.end();
    await this.#connection.close();
    this.#onClose();
  }

  #sendAuthMessage(): void {
    this.#connection.send(createAuthMessage(this.#account, this.#credentials));
  }

  #handleMessage(rawMessage: unknown): void {
    const parsed = RfqQuoterInboundMessageSchema.safeParse(rawMessage);
    if (!parsed.success) {
      const error = new TransportError('Invalid RFQ quoter message.', {
        cause: parsed.error,
      });
      this.#pending.rejectAll(error);
      return;
    }

    const message = parsed.data;
    switch (message.type) {
      case 'auth':
        this.#handleAuthMessage(message);
        return;
      case 'quote_request':
        this.#queue.push(toQuoteRequestEvent(this, message));
        return;
      case 'quote_ack':
        this.#pending.resolve(quoteAckKey(message.rfqId), toQuoteAck(message));
        return;
      case 'confirmation_request':
        this.#queue.push(toConfirmationRequestEvent(this, message));
        return;
      case 'confirmation_ack':
        this.#pending.resolve(
          confirmationAckKey(message.rfqId, message.quoteId),
          toConfirmationAck(message),
        );
        return;
      case 'execution_update':
        this.#queue.push(toExecutionUpdateEvent(message));
        return;
      case 'error':
        return;
    }
  }

  #handleAuthMessage(message: { error?: string; success: boolean }): void {
    if (message.success === true) {
      this.#auth?.resolve(undefined);
      return;
    }
    this.#auth?.reject(
      new TransportError(`RFQ quoter authentication failed: ${message.error}`),
    );
  }

  #handleClose(): void {
    void this.close();
  }

  async quote(
    request: RfqQuoteRequest,
    response: RfqQuoteResponse,
  ): Promise<RfqQuoteAck> {
    const quote = await createRfqQuote({
      account: this.#account,
      chainId: this.#chainId,
      exchange: this.#exchange,
      request,
      response,
      signer: this.#signer,
    });
    const pending = this.#pending.waitFor<RfqQuoteAck>(
      quoteAckKey(request.rfqId),
      `Timed out waiting for RFQ quote acknowledgement for ${request.rfqId}.`,
    );
    try {
      await this.#send(createQuoteMessage(request, quote));
      return await pending;
    } catch (error) {
      this.#pending.remove(quoteAckKey(request.rfqId), pending);
      throw error;
    }
  }

  async respondToConfirmation(
    rfqId: RfqId,
    quoteId: RfqQuoteId,
    decision: RfqConfirmationDecision,
  ): Promise<RfqConfirmationAck> {
    const key = confirmationAckKey(rfqId, quoteId);
    const pending = this.#pending.waitFor<RfqConfirmationAck>(
      key,
      `Timed out waiting for RFQ confirmation acknowledgement for ${rfqId}.`,
    );
    try {
      await this.#send(
        createConfirmationResponseMessage(rfqId, quoteId, decision),
      );
      return await pending;
    } catch (error) {
      this.#pending.remove(key, pending);
      throw error;
    }
  }
}

function quoteAckKey(rfqId: RfqId): string {
  return `ACK_RFQ_QUOTE:${rfqId}`;
}

function confirmationAckKey(rfqId: RfqId, quoteId: RfqQuoteId): string {
  return `ACK_RFQ_CONFIRMATION_RESPONSE:${rfqId}:${quoteId}`;
}

type PendingResponse<T> = {
  promise: Promise<T>;
  reject(error: Error): void;
  resolve(value: T): void;
};

function createPending<T>(): PendingResponse<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
