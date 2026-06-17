import type { PerpsCredentials } from '@polymarket/bindings/perps';
import { PerpsSession } from './session';

export type PerpsSessionManagerOptions = {
  chainId: number;
  restUrl: string;
  wsUrl: string;
};

export class PerpsSessionManager {
  readonly #chainId: number;
  readonly #restUrl: string;
  readonly #wsUrl: string;
  readonly #sessions = new Set<PerpsSession>();
  readonly #connectingSessions = new Set<PerpsSession>();
  readonly #connecting = new Set<Promise<PerpsSession>>();

  constructor(options: PerpsSessionManagerOptions) {
    this.#chainId = options.chainId;
    this.#restUrl = options.restUrl;
    this.#wsUrl = options.wsUrl;
  }

  connect(credentials: PerpsCredentials): Promise<PerpsSession> {
    const session = new PerpsSession({
      chainId: this.#chainId,
      credentials,
      onClose: (closedSession) => this.#clearSession(closedSession),
      restUrl: this.#restUrl,
      wsUrl: this.#wsUrl,
    });
    this.#connectingSessions.add(session);

    let connecting!: Promise<PerpsSession>;
    connecting = (async () => {
      try {
        await session.connect();
        this.#sessions.add(session);
        return session;
      } catch (error) {
        await session.close();
        throw error;
      } finally {
        this.#connecting.delete(connecting);
        this.#connectingSessions.delete(session);
      }
    })();

    this.#connecting.add(connecting);
    return connecting;
  }

  async close(): Promise<void> {
    const sessions = Array.from(this.#sessions);
    const connectingSessions = Array.from(this.#connectingSessions);
    const connecting = Array.from(this.#connecting);

    this.#sessions.clear();
    this.#connectingSessions.clear();
    this.#connecting.clear();

    await Promise.allSettled([
      ...sessions.map((session) => session.close()),
      ...connectingSessions.map((session) => session.close()),
      ...connecting.map((promise) => promise.catch(() => undefined)),
    ]).then(() => undefined);
  }

  #clearSession(session: PerpsSession): void {
    this.#sessions.delete(session);
    this.#connectingSessions.delete(session);
  }
}
