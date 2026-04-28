import {
  setNonBlockingInterval,
  setNonBlockingTimeout,
} from '@polymarket/types';

export class ClientPingHeartbeat {
  readonly #message: string;
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(message: string) {
    this.#message = message;
  }

  start(socket: WebSocket, intervalMs: number): void {
    this.stop();
    this.#timer = setNonBlockingInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(this.#message);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }
}

export type ReconnectSchedulerOptions = {
  baseDelayMs: number;
  maxDelayMs: number;
};

export type ScheduleReconnectOptions = {
  shouldReconnect: () => boolean;
  reconnect: () => Promise<unknown>;
};

export class ReconnectScheduler {
  readonly #baseDelayMs: number;
  readonly #maxDelayMs: number;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #attempt = 0;

  constructor(options: ReconnectSchedulerOptions) {
    this.#baseDelayMs = options.baseDelayMs;
    this.#maxDelayMs = options.maxDelayMs;
  }

  schedule(options: ScheduleReconnectOptions): void {
    if (this.#timer !== undefined || !options.shouldReconnect()) {
      return;
    }

    const delay = reconnectDelay(this.#attempt, {
      baseMs: this.#baseDelayMs,
      maxMs: this.#maxDelayMs,
    });
    this.#attempt += 1;
    this.#timer = setNonBlockingTimeout(() => {
      this.#timer = undefined;
      void this.#reconnect(options);
    }, delay);
  }

  stop(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }

  resetBackoff(): void {
    this.#attempt = 0;
    this.stop();
  }

  async #reconnect(options: ScheduleReconnectOptions): Promise<void> {
    if (!options.shouldReconnect()) return;
    try {
      await options.reconnect();
    } catch {
      this.schedule(options);
    }
  }
}

export class WebSocketConnection {
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocket> | undefined;

  get current(): WebSocket | undefined {
    return this.#socket;
  }

  ensure(open: () => Promise<WebSocket>): Promise<WebSocket> {
    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(socket);
    }
    this.#socket = undefined;
    if (this.#connecting !== undefined) return this.#connecting;

    const connecting = open().catch((error: unknown) => {
      if (this.#connecting === connecting) {
        this.#connecting = undefined;
      }
      throw error;
    });
    this.#connecting = connecting;
    return connecting;
  }

  markOpen(socket: WebSocket): void {
    this.#socket = socket;
    this.#connecting = undefined;
  }

  clearSocket(): void {
    this.#socket = undefined;
  }

  hasOpenSocket(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  isCurrent(socket: WebSocket): boolean {
    return this.#socket === socket;
  }

  hasDifferentCurrent(socket: WebSocket): boolean {
    return this.#socket !== undefined && this.#socket !== socket;
  }

  async takeCurrent(): Promise<WebSocket | undefined> {
    const socket = this.#socket;
    const connecting = this.#connecting;

    this.#socket = undefined;
    this.#connecting = undefined;

    if (socket !== undefined) return socket;
    return connecting?.catch(() => undefined);
  }
}

type ReconnectDelayOptions = {
  baseMs: number;
  maxMs: number;
};

function reconnectDelay(
  attempt: number,
  options: ReconnectDelayOptions,
): number {
  const exponentialDelay = Math.min(
    options.baseMs * 2 ** attempt,
    options.maxMs,
  );
  return Math.random() * exponentialDelay;
}

function waitForSocketClose(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    socket.addEventListener('close', () => resolve(), { once: true });
  });
}

export async function closeSocket(
  socket: WebSocket | undefined,
): Promise<void> {
  if (socket === undefined || socket.readyState === WebSocket.CLOSED) return;
  if (socket.readyState === WebSocket.CLOSING) {
    await waitForSocketClose(socket);
    return;
  }

  await new Promise<void>((resolve) => {
    socket.addEventListener('close', () => resolve(), { once: true });
    socket.close();
  });
}
