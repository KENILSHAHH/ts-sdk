import type { PerpsCredentials } from '@polymarket/bindings/perps';
import {
  type PerpsSessionEvent,
  PerpsSessionUpdateEventSchema,
} from '@polymarket/bindings/subscriptions';
import { setNonBlockingTimeout } from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import { z } from 'zod';
import { TransportError } from '../../errors';
import { PerpsWebSocketHeartbeat } from '../heartbeat';
import { ReconnectScheduler, WebSocketConnection } from '../lifecycle';

const AUTH_TIMEOUT_MS = 30_000;
const ACK_TIMEOUT_MS = 30_000;
const PERPS_SESSION_CHANNELS = [
  'balances',
  'portfolio',
  'orders',
  'fills',
  'funding',
  'deposits',
  'withdrawals',
] as const;

const PerpsGenericResponseSchema = z.object({
  status: z.enum(['ok', 'err']),
  error: z.string().optional(),
});

const PerpsResponseSchema = z
  .object({
    id: z.number().int().positive().optional(),
    data: z.union([
      PerpsGenericResponseSchema,
      z.array(PerpsGenericResponseSchema),
    ]),
  })
  .transform((response) => ({
    id: response.id,
    data: Array.isArray(response.data)
      ? (response.data.find((item) => item.status === 'err') ??
        response.data[0])
      : response.data,
  }));

type PendingResponse = {
  reject(error: Error): void;
  resolve(): void;
};

export type { PerpsSessionEvent } from '@polymarket/bindings/subscriptions';

export type PerpsSessionOptions = {
  credentials: PerpsCredentials;
  onClose: (session: PerpsSession) => void;
  url: string;
};

export class PerpsSession implements AsyncIterable<PerpsSessionEvent> {
  readonly credentials: PerpsCredentials;
  readonly #onClose: (session: PerpsSession) => void;
  readonly #url: string;
  readonly #connection = new WebSocketConnection({
    heartbeat: new PerpsWebSocketHeartbeat(),
  });
  readonly #queue: Pushable<PerpsSessionEvent> = pushable({ objectMode: true });
  readonly #pending = new Map<number, PendingResponse>();
  readonly #reconnectScheduler = new ReconnectScheduler();
  readonly #sequences = new Map<string, number>();
  readonly #lastDedupedPayload = new Map<string, string>();
  #nextRequestId = 1;
  #closing: Promise<void> | undefined;

  constructor(options: PerpsSessionOptions) {
    this.credentials = options.credentials;
    this.#onClose = options.onClose;
    this.#url = options.url;
  }

  get closed(): boolean {
    return this.#closing !== undefined;
  }

  async connect(): Promise<void> {
    await this.#connect(false);
  }

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown();
    }
    await this.#closing;
  }

  [Symbol.asyncIterator](): AsyncIterator<PerpsSessionEvent> {
    return this.#queue[Symbol.asyncIterator]();
  }

  async #connect(emitResync: boolean): Promise<void> {
    await this.#connection.connect({
      onClose: () => this.#handleClose(),
      onError: () => undefined,
      onMessage: (message) => this.#handleMessage(message),
      onOpen: () => undefined,
      url: this.#url,
    });
    await this.#authenticate();
    await this.#subscribe();

    this.#reconnectScheduler.resetBackoff();
    if (emitResync) {
      this.#sequences.clear();
      this.#lastDedupedPayload.clear();
      this.#queue.push({
        reason: 'reconnect',
        type: 'resync',
      });
    }
  }

  async #authenticate(): Promise<void> {
    await this.#sendRequest(
      {
        id: this.#nextRequestId++,
        op: {
          args: {
            proxy: this.credentials.proxy,
            secret: this.credentials.secret,
          },
          type: 'auth',
        },
        req: 'post',
      },
      AUTH_TIMEOUT_MS,
      'Perps session authentication timed out.',
    );
  }

  async #subscribe(): Promise<void> {
    await this.#sendRequest(
      {
        id: this.#nextRequestId++,
        req: 'sub',
        chs: PERPS_SESSION_CHANNELS,
      },
      ACK_TIMEOUT_MS,
      'Perps session subscription timed out.',
    );
  }

  async #sendRequest(
    frame: Record<string, unknown> & { id: number },
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<void> {
    const pending = createPendingResponse();
    this.#pending.set(frame.id, pending);
    const timeout = setNonBlockingTimeout(() => {
      pending.reject(new TransportError(timeoutMessage));
    }, timeoutMs);

    try {
      if (!this.#connection.send(frame)) {
        throw new TransportError('Perps session transport is not open.');
      }
      await pending.promise;
    } finally {
      clearTimeout(timeout);
      this.#pending.delete(frame.id);
    }
  }

  async #shutdown(): Promise<void> {
    this.#reconnectScheduler.stop();
    this.#rejectPending(new TransportError('Perps session closed.'));
    this.#queue.end();
    await this.#connection.close();
    this.#onClose(this);
  }

  #handleMessage(rawMessage: unknown): void {
    if (this.#handleResponse(rawMessage)) return;

    const parsed = PerpsSessionUpdateEventSchema.safeParse(rawMessage);
    if (!parsed.success) return;

    const event = parsed.data;
    if (this.#shouldSkipDedupedTick(event)) return;
    this.#pushSequenceGapIfNeeded(event);
    this.#queue.push(event);
  }

  #handleResponse(rawMessage: unknown): boolean {
    const parsed = PerpsResponseSchema.safeParse(rawMessage);
    if (!parsed.success || parsed.data.id === undefined) return false;

    const pending = this.#pending.get(parsed.data.id);
    if (pending === undefined) return true;

    if (parsed.data.data === undefined) {
      pending.reject(new TransportError('Perps session empty response.'));
      return true;
    }

    if (parsed.data.data.status === 'ok') {
      pending.resolve();
    } else {
      pending.reject(
        new TransportError(
          parsed.data.data.error ?? 'Perps session request rejected.',
        ),
      );
    }
    return true;
  }

  #handleClose(): void {
    this.#rejectPending(new TransportError('Perps session connection closed.'));
    if (this.#closing !== undefined) return;

    this.#reconnectScheduler.schedule({
      reconnect: () => this.#connect(true),
      shouldReconnect: () => this.#closing === undefined,
    });
  }

  #rejectPending(error: Error): void {
    for (const pending of this.#pending.values()) {
      pending.reject(error);
    }
    this.#pending.clear();
  }

  #shouldSkipDedupedTick(event: {
    channel: string;
    payload: unknown;
  }): boolean {
    if (event.channel !== 'balances' && event.channel !== 'portfolio') {
      return false;
    }

    const payload = JSON.stringify(event.payload);
    const previousPayload = this.#lastDedupedPayload.get(event.channel);
    this.#lastDedupedPayload.set(event.channel, payload);
    return payload === previousPayload;
  }

  #pushSequenceGapIfNeeded(event: { channel: string; sequence: number }): void {
    const previousSequence = this.#sequences.get(event.channel);
    this.#sequences.set(event.channel, event.sequence);

    if (
      previousSequence === undefined ||
      event.sequence === previousSequence + 1
    ) {
      return;
    }

    this.#queue.push({
      channel: event.channel,
      previousSequence,
      reason: 'sequence_gap',
      sequence: event.sequence,
      type: 'resync',
    });
  }
}

function createPendingResponse(): PendingResponse & { promise: Promise<void> } {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}
