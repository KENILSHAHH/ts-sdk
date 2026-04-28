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

export function waitForSocketClose(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    socket.addEventListener('close', () => resolve(), { once: true });
  });
}
