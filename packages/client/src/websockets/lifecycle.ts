import { setNonBlockingInterval } from '@polymarket/types';

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

export type ReconnectDelayOptions = {
  baseMs: number;
  maxMs: number;
};

export function reconnectDelay(
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
