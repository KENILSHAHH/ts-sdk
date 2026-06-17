import type { PerpsCredentials } from '@polymarket/bindings/perps';
import type { ServiceClient } from '../../ServiceClient';
import { PerpsSession } from './session';

export type PerpsSessionManagerOptions = {
  api: ServiceClient;
  chainId: number;
  url: string;
};

export class PerpsSessionManager {
  readonly #api: ServiceClient;
  readonly #chainId: number;
  readonly #url: string;
  readonly #sessions = new Set<PerpsSession>();
  readonly #connectingSessions = new Set<PerpsSession>();
  readonly #connecting = new Set<Promise<PerpsSession>>();

  constructor(options: PerpsSessionManagerOptions) {
    this.#api = options.api;
    this.#chainId = options.chainId;
    this.#url = options.url;
  }

  connect(credentials: PerpsCredentials): Promise<PerpsSession> {
    const session = new PerpsSession({
      api: this.#api,
      chainId: this.#chainId,
      credentials,
      onClose: (closedSession) => this.#clearSession(closedSession),
      url: this.#url,
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
