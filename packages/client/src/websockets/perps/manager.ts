import type { PerpsCredentials } from '@polymarket/bindings/perps';
import { TransportError } from '../../errors';
import { PerpsSession } from './session';

export type PerpsSessionManagerOptions = {
  chainId: number;
  restHeaders?: Record<string, string>;
  restUrl: string;
  wsHeaders?: Record<string, string>;
  wsUrl: string;
};

export class PerpsSessionManager {
  readonly #chainId: number;
  readonly #restHeaders: Record<string, string> | undefined;
  readonly #restUrl: string;
  readonly #wsHeaders: Record<string, string> | undefined;
  readonly #wsUrl: string;
  readonly #sessions = new Set<PerpsSession>();
  readonly #connectingSessions = new Set<PerpsSession>();
  readonly #connecting = new Set<Promise<PerpsSession>>();
  #hasShutdown = false;

  constructor(options: PerpsSessionManagerOptions) {
    this.#chainId = options.chainId;
    this.#restHeaders = options.restHeaders;
    this.#restUrl = options.restUrl;
    this.#wsHeaders = options.wsHeaders;
    this.#wsUrl = options.wsUrl;
  }

  connect(credentials: PerpsCredentials): Promise<PerpsSession> {
    if (this.#hasShutdown) {
      return Promise.reject(
        new TransportError('Perps session manager has been shut down.'),
      );
    }

    const session = new PerpsSession({
      chainId: this.#chainId,
      credentials,
      onClose: (closedSession) => this.#clearSession(closedSession),
      restHeaders: this.#restHeaders,
      restUrl: this.#restUrl,
      wsHeaders: this.#wsHeaders,
      wsUrl: this.#wsUrl,
    });
    this.#connectingSessions.add(session);

    let connecting!: Promise<PerpsSession>;
    connecting = (async () => {
      try {
        await session.connect();
        if (this.#hasShutdown) {
          await session.close();
          throw new TransportError('Perps session manager has been shut down.');
        }
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

  async shutdown(): Promise<void> {
    this.#hasShutdown = true;
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
