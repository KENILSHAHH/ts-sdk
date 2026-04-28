import { setNonBlockingInterval } from '@polymarket/types';
import type { WebSocketHeartbeat } from './lifecycle';

const CLOB_HEARTBEAT_INTERVAL_MS = 10_000;
const RTDS_HEARTBEAT_INTERVAL_MS = 5_000;

export class ClobWebSocketHeartbeat implements WebSocketHeartbeat {
  #timer: ReturnType<typeof setInterval> | undefined;

  start(send: (message: string) => void): void {
    this.stop();
    this.#timer = setNonBlockingInterval(() => {
      send('PING');
    }, CLOB_HEARTBEAT_INTERVAL_MS);
  }

  handleMessage(message: string): boolean {
    return message === 'PONG';
  }

  stop(): void {
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }
}

export class RtdsWebSocketHeartbeat implements WebSocketHeartbeat {
  #timer: ReturnType<typeof setInterval> | undefined;

  start(send: (message: string) => void): void {
    this.stop();
    this.#timer = setNonBlockingInterval(() => {
      send('PING');
    }, RTDS_HEARTBEAT_INTERVAL_MS);
  }

  handleMessage(): boolean {
    return false;
  }

  stop(): void {
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }
}

export class SportsWebSocketHeartbeat implements WebSocketHeartbeat {
  #send: ((message: string) => void) | undefined;

  start(send: (message: string) => void): void {
    this.#send = send;
  }

  stop(): void {
    this.#send = undefined;
  }

  handleMessage(message: string): boolean {
    if (message !== 'ping') return false;
    this.#send?.('pong');
    return true;
  }
}
