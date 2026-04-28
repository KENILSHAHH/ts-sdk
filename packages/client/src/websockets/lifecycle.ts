import { setNonBlockingTimeout } from '@polymarket/types';
import { TransportError } from '../errors';

export type WebSocketHeartbeat = {
  handleMessage(message: string): boolean;
  start(send: (message: string) => void): void;
  stop(): void;
};

export type ReconnectSchedulerOptions = {
  baseDelayMs: number;
  maxDelayMs: number;
};

export type ScheduleReconnectOptions = {
  shouldReconnect: () => boolean;
  reconnect: () => Promise<unknown>;
};

export type WebSocketConnectionOptions<TContext = undefined> = {
  onClose: () => void;
  onError: () => void;
  onMessage: (message: unknown) => void;
  onOpen: (context: TContext) => void;
  prepare?: () => TContext | Promise<TContext>;
  url: string;
};

export type WebSocketConnectionResult = {
  reusedOpenSocket: boolean;
};

export type WebSocketConnectionConstructorOptions = {
  heartbeat: WebSocketHeartbeat;
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
  readonly #heartbeat: WebSocketHeartbeat;
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocketConnectionResult> | undefined;

  constructor(options: WebSocketConnectionConstructorOptions) {
    this.#heartbeat = options.heartbeat;
  }

  connect<TContext = undefined>(
    options: WebSocketConnectionOptions<TContext>,
  ): Promise<WebSocketConnectionResult> {
    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve({ reusedOpenSocket: true });
    }
    this.#clearCurrentSocket();
    if (this.#connecting !== undefined) return this.#connecting;

    const connecting = this.#open(options)
      .then(() => ({ reusedOpenSocket: false }))
      .catch((error: unknown) => {
        if (this.#connecting === connecting) {
          this.#connecting = undefined;
        }
        throw error;
      });
    this.#connecting = connecting;
    return connecting;
  }

  send(message: string): boolean {
    // Reconnects and shutdown can race with protocol updates; callers use the
    // boolean result only when they need to know whether the frame was sent.
    if (this.#socket?.readyState !== WebSocket.OPEN) return false;
    this.#socket.send(message);
    return true;
  }

  async close(): Promise<void> {
    const socket = await this.#takeCurrent();
    this.#heartbeat.stop();
    if (socket === undefined || socket.readyState === WebSocket.CLOSED) return;

    await new Promise<void>((resolve) => {
      socket.addEventListener('close', () => resolve(), { once: true });
      if (socket.readyState !== WebSocket.CLOSING) {
        socket.close();
      }
    });
  }

  async #open<TContext>(
    options: WebSocketConnectionOptions<TContext>,
  ): Promise<WebSocket> {
    const context = await options.prepare?.();

    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(options.url);

      const onOpen = () => {
        socket.removeEventListener('error', onOpenError);
        this.#markOpen(socket);
        this.#heartbeat.start((message) => this.send(message));
        options.onOpen(context as TContext);
        resolve(socket);
      };
      const onOpenError = (event: Event) => {
        socket.removeEventListener('open', onOpen);
        reject(
          new TransportError(`WebSocket connection failed: ${options.url}`, {
            cause: event,
          }),
        );
      };

      socket.addEventListener('open', onOpen, { once: true });
      socket.addEventListener('error', onOpenError, { once: true });
      socket.addEventListener('message', (event) => {
        if (this.#socket !== socket) return;
        const message = String(event.data);
        if (this.#heartbeat.handleMessage(message)) return;

        let raw: unknown;
        try {
          raw = JSON.parse(message);
        } catch {
          return;
        }
        options.onMessage(raw);
      });
      socket.addEventListener('close', () => {
        if (this.#socket !== socket) return;
        this.#clearCurrentSocket();
        options.onClose();
      });
      socket.addEventListener('error', () => options.onError());
    });
  }

  #markOpen(socket: WebSocket): void {
    this.#socket = socket;
    this.#connecting = undefined;
  }

  #clearCurrentSocket(): void {
    this.#heartbeat.stop();
    this.#socket = undefined;
  }

  async #takeCurrent(): Promise<WebSocket | undefined> {
    const socket = this.#socket;
    const connecting = this.#connecting;

    this.#socket = undefined;
    this.#connecting = undefined;

    if (socket !== undefined) return socket;
    return connecting?.then(
      () => this.#socket,
      () => undefined,
    );
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
