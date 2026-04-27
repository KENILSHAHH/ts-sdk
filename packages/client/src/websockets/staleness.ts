import { setNonBlockingTimeout } from '@polymarket/types';

export type StalenessWatchdogOptions = {
  intervalMs: number;
  onStale: () => void;
};

export class StalenessWatchdog {
  readonly #intervalMs: number;
  readonly #onStale: () => void;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: StalenessWatchdogOptions) {
    this.#intervalMs = options.intervalMs;
    this.#onStale = options.onStale;
  }

  start(): void {
    this.#schedule();
  }

  markFresh(): void {
    if (this.#timer !== undefined) {
      this.#schedule();
    }
  }

  stop(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }

  #schedule(): void {
    this.stop();
    this.#timer = setNonBlockingTimeout(() => {
      this.#timer = undefined;
      this.#onStale();
    }, this.#intervalMs);
  }
}
