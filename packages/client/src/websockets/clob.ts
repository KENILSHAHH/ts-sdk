import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import {
  type MarketEvent,
  MarketEventSchema,
  type UserEvent,
  UserEventSchema,
} from '@polymarket/bindings/subscriptions';
import { setNonBlockingTimeout } from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import type {
  MarketSubscription,
  SubscriptionHandle,
  UserSubscription,
} from '../actions/subscriptions';
import {
  ClientPingHeartbeat,
  reconnectDelay,
  waitForSocketClose,
} from './lifecycle';
import { StalenessWatchdog } from './staleness';
import type { WebSocketManager } from './types';

type MarketSubscriber = {
  matches: (event: MarketEvent) => boolean;
  queue: Pushable<MarketEvent>;
};

type MarketSubscriptionEntry = {
  subscription: MarketSubscription;
  subscriber: MarketSubscriber;
};

type MarketServerSubscription = {
  assetsIds: string[];
  customFeatureEnabled: boolean;
};

type UserSubscriber = {
  matches: (event: UserEvent) => boolean;
  queue: Pushable<UserEvent>;
};

type UserSubscriptionEntry = {
  subscription: UserSubscription;
  subscriber: UserSubscriber;
};

type UserServerSubscription = {
  includeAllMarkets: boolean;
  markets: string[];
};

type ApiKeyCredsProvider = () => ApiKeyCreds | Promise<ApiKeyCreds>;

export type ClobMarketWebSocketManagerOptions = {
  url: string;
};

export type ClobUserWebSocketManagerOptions = {
  resolveCredentials: ApiKeyCredsProvider;
  url: string;
};

const HEARTBEAT_INTERVAL_MS = 10_000;
const STALENESS_INTERVAL_MS = 30_000;
const RECONNECT_BASE_DELAY_MS = 250;
const RECONNECT_MAX_DELAY_MS = 30_000;

/**
 * CLOB market WebSocket manager.
 *
 * The CLOB server tracks market subscriptions by asset id on the connection.
 * Incremental subscribe/unsubscribe frames mutate that server-side asset set.
 */
export class ClobMarketWebSocketManager
  implements WebSocketManager<MarketSubscription, MarketEvent>
{
  readonly #url: string;
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocket> | undefined;
  #closing: Promise<void> | undefined;
  readonly #heartbeat = new ClientPingHeartbeat('PING');
  readonly #stalenessWatchdog: StalenessWatchdog;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempt = 0;
  readonly #entries = new Set<MarketSubscriptionEntry>();

  constructor(options: ClobMarketWebSocketManagerOptions) {
    this.#url = options.url;
    this.#stalenessWatchdog = new StalenessWatchdog({
      intervalMs: STALENESS_INTERVAL_MS,
      onStale: () => this.#forceReconnect(),
    });
  }

  async subscribe(
    subscription: MarketSubscription,
  ): Promise<SubscriptionHandle<MarketEvent>> {
    const entry: MarketSubscriptionEntry = {
      subscription,
      subscriber: {
        matches: marketMatcherFor(subscription),
        queue: pushable<MarketEvent>({ objectMode: true }),
      },
    };

    await this.#registerSubscriber(entry);
    return this.#createHandle(entry);
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(entry: MarketSubscriptionEntry): Promise<void> {
    const wasOpen = this.#hasOpenSocket();
    const before = this.#activeServerSubscription();
    this.#entries.add(entry);
    const after = this.#activeServerSubscription();

    let socket: WebSocket;
    try {
      socket = await this.#ensureSocket();
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
    if (wasOpen) {
      syncMarketSubscription(socket, before, after);
    }
  }

  #createHandle(
    entry: MarketSubscriptionEntry,
  ): SubscriptionHandle<MarketEvent> {
    let closing: Promise<void> | undefined;
    return {
      close: () => {
        if (closing === undefined) {
          closing = this.#closeSubscriber(entry);
        }
        return closing;
      },
      [Symbol.asyncIterator]() {
        return entry.subscriber.queue[Symbol.asyncIterator]();
      },
    };
  }

  async #closeSubscriber(entry: MarketSubscriptionEntry): Promise<void> {
    const before = this.#activeServerSubscription();
    this.#entries.delete(entry);
    entry.subscriber.queue.end();
    const after = this.#activeServerSubscription();

    if (this.#entries.size === 0) {
      await this.close();
      return;
    }

    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      syncMarketSubscription(socket, before, after);
    }
  }

  // Socket lifecycle.

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown().finally(() => {
        this.#closing = undefined;
      });
    }
    await this.#closing;
  }

  async #shutdown(): Promise<void> {
    this.#stopHeartbeat();
    this.#stopStalenessWatchdog();
    this.#stopReconnect();
    this.#endSubscribers();

    const socket = await this.#takeCurrentSocket();
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

  #endSubscribers(error?: Error): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.end(error);
    }
    this.#entries.clear();
  }

  async #takeCurrentSocket(): Promise<WebSocket | undefined> {
    const socket = this.#socket;
    const connecting = this.#connecting;

    this.#socket = undefined;
    this.#connecting = undefined;

    if (socket !== undefined) return socket;
    return connecting?.catch(() => undefined);
  }

  #hasOpenSocket(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  #ensureSocket(): Promise<WebSocket> {
    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(socket);
    }
    this.#socket = undefined;
    if (this.#connecting !== undefined) return this.#connecting;

    this.#connecting = this.#openSocket();
    return this.#connecting;
  }

  #openSocket(): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.#url);

      const onOpen = () => {
        socket.removeEventListener('error', onOpenError);
        this.#onSocketOpen(socket);
        resolve(socket);
      };
      const onOpenError = () => {
        socket.removeEventListener('open', onOpen);
        this.#connecting = undefined;
        reject(new Error('CLOB market WebSocket failed to open.'));
      };

      socket.addEventListener('open', onOpen, { once: true });
      socket.addEventListener('error', onOpenError, { once: true });
      socket.addEventListener('message', (event) =>
        this.#onSocketMessage(socket, event),
      );
      socket.addEventListener('close', () => this.#onSocketClose(socket));
      socket.addEventListener('error', () => this.#onSocketError());
    });
  }

  #onSocketOpen(socket: WebSocket): void {
    this.#socket = socket;
    this.#connecting = undefined;
    this.#resetReconnectBackoff();
    this.#sendInitialSubscription(socket);
    this.#startHeartbeat(socket);
    this.#startStalenessWatchdog();
  }

  #onSocketMessage(socket: WebSocket, event: MessageEvent): void {
    if (this.#socket !== socket) return;

    const data = String(event.data);
    if (data === 'PONG') {
      this.#markSocketFresh();
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      return;
    }

    const events = Array.isArray(raw) ? raw : [raw];
    for (const eventData of events) {
      const parsed = MarketEventSchema.safeParse(eventData);
      if (!parsed.success) continue;
      this.#markSocketFresh();
      this.#dispatch(parsed.data);
    }
  }

  #dispatch(event: MarketEvent): void {
    for (const { subscriber } of this.#entries) {
      if (subscriber.matches(event)) {
        subscriber.queue.push(event);
      }
    }
  }

  #onSocketClose(socket: WebSocket): void {
    if (this.#socket !== undefined && this.#socket !== socket) return;
    this.#stopHeartbeat();
    this.#stopStalenessWatchdog();
    this.#socket = undefined;
    if (this.#entries.size > 0) {
      this.#scheduleReconnect();
    }
  }

  #onSocketError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  // Heartbeat.

  #startHeartbeat(socket: WebSocket): void {
    this.#heartbeat.start(socket, HEARTBEAT_INTERVAL_MS);
  }

  #stopHeartbeat(): void {
    this.#heartbeat.stop();
  }

  // Data staleness watchdog.

  #startStalenessWatchdog(): void {
    this.#stalenessWatchdog.start();
  }

  #markSocketFresh(): void {
    this.#stalenessWatchdog.markFresh();
  }

  #stopStalenessWatchdog(): void {
    this.#stalenessWatchdog.stop();
  }

  #forceReconnect(): void {
    const socket = this.#socket;
    this.#stopHeartbeat();
    this.#stopStalenessWatchdog();
    this.#socket = undefined;

    if (
      socket !== undefined &&
      socket.readyState !== WebSocket.CLOSING &&
      socket.readyState !== WebSocket.CLOSED
    ) {
      socket.close();
    }
    if (this.#entries.size > 0) {
      this.#scheduleReconnect();
    }
  }

  // CLOB market subscribe/unsubscribe frames.

  #sendInitialSubscription(socket: WebSocket): void {
    socket.send(
      JSON.stringify(
        buildMarketSubscribeMessage(this.#activeServerSubscription()),
      ),
    );
  }

  #activeServerSubscription(): MarketServerSubscription {
    const assets = new Set<string>();
    let customFeatureEnabled = false;
    for (const { subscription } of this.#entries) {
      for (const tokenId of subscription.tokenIds) assets.add(tokenId);
      customFeatureEnabled ||= subscription.customFeatureEnabled === true;
    }
    return { assetsIds: Array.from(assets), customFeatureEnabled };
  }

  // Reconnect.

  #scheduleReconnect(): void {
    if (
      this.#reconnectTimer !== undefined ||
      this.#connecting !== undefined ||
      this.#entries.size === 0
    ) {
      return;
    }
    const delay = reconnectDelay(this.#reconnectAttempt, {
      baseMs: RECONNECT_BASE_DELAY_MS,
      maxMs: RECONNECT_MAX_DELAY_MS,
    });
    this.#reconnectAttempt += 1;
    this.#reconnectTimer = setNonBlockingTimeout(() => {
      this.#reconnectTimer = undefined;
      void this.#reconnect();
    }, delay);
  }

  async #reconnect(): Promise<void> {
    if (this.#entries.size === 0) return;
    try {
      await this.#ensureSocket();
    } catch {
      this.#scheduleReconnect();
    }
  }

  #stopReconnect(): void {
    if (this.#reconnectTimer !== undefined) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = undefined;
    }
  }

  #resetReconnectBackoff(): void {
    this.#reconnectAttempt = 0;
  }
}

export class ClobUserWebSocketManager
  implements WebSocketManager<UserSubscription, UserEvent>
{
  readonly #url: string;
  readonly #resolveCredentials: ApiKeyCredsProvider;
  #socket: WebSocket | undefined;
  #connecting: Promise<WebSocket> | undefined;
  #closing: Promise<void> | undefined;
  readonly #heartbeat = new ClientPingHeartbeat('PING');
  readonly #stalenessWatchdog: StalenessWatchdog;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempt = 0;
  readonly #entries = new Set<UserSubscriptionEntry>();

  constructor(options: ClobUserWebSocketManagerOptions) {
    this.#url = options.url;
    this.#resolveCredentials = options.resolveCredentials;
    this.#stalenessWatchdog = new StalenessWatchdog({
      intervalMs: STALENESS_INTERVAL_MS,
      onStale: () => this.#forceReconnect(),
    });
  }

  async subscribe(
    subscription: UserSubscription,
  ): Promise<SubscriptionHandle<UserEvent>> {
    const entry: UserSubscriptionEntry = {
      subscription,
      subscriber: {
        matches: userMatcherFor(subscription),
        queue: pushable<UserEvent>({ objectMode: true }),
      },
    };

    await this.#registerSubscriber(entry);
    return this.#createHandle(entry);
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(entry: UserSubscriptionEntry): Promise<void> {
    const wasOpen = this.#hasOpenSocket();
    const before = this.#activeServerSubscription();
    this.#entries.add(entry);
    const after = this.#activeServerSubscription();

    let socket: WebSocket;
    try {
      socket = await this.#ensureSocket();
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
    if (wasOpen) {
      syncUserSubscription(socket, before, after);
    }
  }

  #createHandle(entry: UserSubscriptionEntry): SubscriptionHandle<UserEvent> {
    let closing: Promise<void> | undefined;
    return {
      close: () => {
        if (closing === undefined) {
          closing = this.#closeSubscriber(entry);
        }
        return closing;
      },
      [Symbol.asyncIterator]() {
        return entry.subscriber.queue[Symbol.asyncIterator]();
      },
    };
  }

  async #closeSubscriber(entry: UserSubscriptionEntry): Promise<void> {
    const before = this.#activeServerSubscription();
    this.#entries.delete(entry);
    entry.subscriber.queue.end();
    const after = this.#activeServerSubscription();

    if (this.#entries.size === 0) {
      await this.close();
      return;
    }

    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      syncUserSubscription(socket, before, after);
    }
  }

  // Socket lifecycle.

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown().finally(() => {
        this.#closing = undefined;
      });
    }
    await this.#closing;
  }

  async #shutdown(): Promise<void> {
    this.#stopHeartbeat();
    this.#stopStalenessWatchdog();
    this.#stopReconnect();
    this.#endSubscribers();

    const socket = await this.#takeCurrentSocket();
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

  #endSubscribers(error?: Error): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.end(error);
    }
    this.#entries.clear();
  }

  async #takeCurrentSocket(): Promise<WebSocket | undefined> {
    const socket = this.#socket;
    const connecting = this.#connecting;

    this.#socket = undefined;
    this.#connecting = undefined;

    if (socket !== undefined) return socket;
    return connecting?.catch(() => undefined);
  }

  #hasOpenSocket(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  #ensureSocket(): Promise<WebSocket> {
    const socket = this.#socket;
    if (socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(socket);
    }
    this.#socket = undefined;
    if (this.#connecting !== undefined) return this.#connecting;

    this.#connecting = this.#openSocket();
    return this.#connecting;
  }

  async #openSocket(): Promise<WebSocket> {
    const credentials = await this.#resolveCredentials();

    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.#url);

      const onOpen = () => {
        socket.removeEventListener('error', onOpenError);
        this.#onSocketOpen(socket, credentials);
        resolve(socket);
      };
      const onOpenError = () => {
        socket.removeEventListener('open', onOpen);
        this.#connecting = undefined;
        reject(new Error('CLOB user WebSocket failed to open.'));
      };

      socket.addEventListener('open', onOpen, { once: true });
      socket.addEventListener('error', onOpenError, { once: true });
      socket.addEventListener('message', (event) =>
        this.#onSocketMessage(socket, event),
      );
      socket.addEventListener('close', () => this.#onSocketClose(socket));
      socket.addEventListener('error', () => this.#onSocketError());
    });
  }

  #onSocketOpen(socket: WebSocket, credentials: ApiKeyCreds): void {
    this.#socket = socket;
    this.#connecting = undefined;
    this.#resetReconnectBackoff();
    this.#sendInitialSubscription(socket, credentials);
    this.#startHeartbeat(socket);
    this.#startStalenessWatchdog();
  }

  #onSocketMessage(socket: WebSocket, event: MessageEvent): void {
    if (this.#socket !== socket) return;

    const data = String(event.data);
    if (data === 'PONG') {
      this.#markSocketFresh();
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      return;
    }

    const events = Array.isArray(raw) ? raw : [raw];
    for (const eventData of events) {
      const parsed = UserEventSchema.safeParse(eventData);
      if (!parsed.success) continue;
      this.#markSocketFresh();
      this.#dispatch(parsed.data);
    }
  }

  #dispatch(event: UserEvent): void {
    for (const { subscriber } of this.#entries) {
      if (subscriber.matches(event)) {
        subscriber.queue.push(event);
      }
    }
  }

  #onSocketClose(socket: WebSocket): void {
    if (this.#socket !== undefined && this.#socket !== socket) return;
    this.#stopHeartbeat();
    this.#stopStalenessWatchdog();
    this.#socket = undefined;
    if (this.#entries.size > 0) {
      this.#scheduleReconnect();
    }
  }

  #onSocketError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  // Heartbeat.

  #startHeartbeat(socket: WebSocket): void {
    this.#heartbeat.start(socket, HEARTBEAT_INTERVAL_MS);
  }

  #stopHeartbeat(): void {
    this.#heartbeat.stop();
  }

  // Data staleness watchdog.

  #startStalenessWatchdog(): void {
    this.#stalenessWatchdog.start();
  }

  #markSocketFresh(): void {
    this.#stalenessWatchdog.markFresh();
  }

  #stopStalenessWatchdog(): void {
    this.#stalenessWatchdog.stop();
  }

  #forceReconnect(): void {
    const socket = this.#socket;
    this.#stopHeartbeat();
    this.#stopStalenessWatchdog();
    this.#socket = undefined;

    if (
      socket !== undefined &&
      socket.readyState !== WebSocket.CLOSING &&
      socket.readyState !== WebSocket.CLOSED
    ) {
      socket.close();
    }
    if (this.#entries.size > 0) {
      this.#scheduleReconnect();
    }
  }

  // CLOB user subscribe/unsubscribe frames.

  #sendInitialSubscription(socket: WebSocket, credentials: ApiKeyCreds): void {
    socket.send(
      JSON.stringify(
        buildUserSubscribeMessage(
          this.#activeServerSubscription(),
          credentials,
        ),
      ),
    );
  }

  #activeServerSubscription(): UserServerSubscription {
    let includeAllMarkets = false;
    const markets = new Set<string>();
    for (const { subscription } of this.#entries) {
      if (isAllMarketsUserSubscription(subscription)) {
        includeAllMarkets = true;
        continue;
      }
      for (const market of subscription.markets ?? []) markets.add(market);
    }
    return {
      includeAllMarkets,
      markets: includeAllMarkets ? [] : Array.from(markets),
    };
  }

  // Reconnect.

  #scheduleReconnect(): void {
    if (
      this.#reconnectTimer !== undefined ||
      this.#connecting !== undefined ||
      this.#entries.size === 0
    ) {
      return;
    }
    const delay = reconnectDelay(this.#reconnectAttempt, {
      baseMs: RECONNECT_BASE_DELAY_MS,
      maxMs: RECONNECT_MAX_DELAY_MS,
    });
    this.#reconnectAttempt += 1;
    this.#reconnectTimer = setNonBlockingTimeout(() => {
      this.#reconnectTimer = undefined;
      void this.#reconnect();
    }, delay);
  }

  async #reconnect(): Promise<void> {
    if (this.#entries.size === 0) return;
    try {
      await this.#ensureSocket();
    } catch {
      this.#scheduleReconnect();
    }
  }

  #stopReconnect(): void {
    if (this.#reconnectTimer !== undefined) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = undefined;
    }
  }

  #resetReconnectBackoff(): void {
    this.#reconnectAttempt = 0;
  }
}

function syncMarketSubscription(
  socket: WebSocket,
  before: MarketServerSubscription,
  after: MarketServerSubscription,
): void {
  const addedAssets = difference(after.assetsIds, before.assetsIds);
  const removedAssets = difference(before.assetsIds, after.assetsIds);

  if (addedAssets.length > 0) {
    socket.send(
      JSON.stringify(
        buildMarketSubscribeUpdate(addedAssets, after.customFeatureEnabled),
      ),
    );
  }
  const firstActiveAsset = after.assetsIds[0];
  if (
    addedAssets.length === 0 &&
    before.customFeatureEnabled !== after.customFeatureEnabled &&
    firstActiveAsset !== undefined
  ) {
    // CLOB applies `custom_feature_enabled` before rejecting duplicate assets as
    // "NO NEW ASSETS", so this toggles connection-level custom events in place.
    socket.send(
      JSON.stringify(
        buildMarketSubscribeUpdate(
          [firstActiveAsset],
          after.customFeatureEnabled,
        ),
      ),
    );
  }
  if (removedAssets.length > 0) {
    socket.send(JSON.stringify(buildMarketUnsubscribeUpdate(removedAssets)));
  }
}

function syncUserSubscription(
  socket: WebSocket,
  before: UserServerSubscription,
  after: UserServerSubscription,
): void {
  if (after.includeAllMarkets) {
    if (!before.includeAllMarkets && before.markets.length > 0) {
      socket.send(JSON.stringify(buildUserUnsubscribeUpdate(before.markets)));
    }
    return;
  }

  if (before.includeAllMarkets) {
    if (after.markets.length > 0) {
      socket.send(JSON.stringify(buildUserSubscribeUpdate(after.markets)));
    }
    return;
  }

  const addedMarkets = difference(after.markets, before.markets);
  const removedMarkets = difference(before.markets, after.markets);

  if (addedMarkets.length > 0) {
    socket.send(JSON.stringify(buildUserSubscribeUpdate(addedMarkets)));
  }
  if (removedMarkets.length > 0) {
    socket.send(JSON.stringify(buildUserUnsubscribeUpdate(removedMarkets)));
  }
}

function buildMarketSubscribeMessage(
  subscription: MarketServerSubscription,
): unknown {
  return {
    assets_ids: subscription.assetsIds,
    custom_feature_enabled: subscription.customFeatureEnabled,
    type: 'market',
  };
}

function buildMarketSubscribeUpdate(
  assetsIds: readonly string[],
  customFeatureEnabled: boolean,
): unknown {
  return {
    assets_ids: assetsIds,
    custom_feature_enabled: customFeatureEnabled,
    operation: 'subscribe',
  };
}

function buildMarketUnsubscribeUpdate(assetsIds: readonly string[]): unknown {
  return {
    assets_ids: assetsIds,
    operation: 'unsubscribe',
  };
}

function buildUserSubscribeMessage(
  subscription: UserServerSubscription,
  credentials: ApiKeyCreds,
): unknown {
  return {
    auth: {
      apiKey: credentials.key,
      passphrase: credentials.passphrase,
      secret: credentials.secret,
    },
    markets: subscription.markets,
    type: 'user',
  };
}

function buildUserSubscribeUpdate(markets: readonly string[]): unknown {
  return {
    markets,
    operation: 'subscribe',
  };
}

function buildUserUnsubscribeUpdate(markets: readonly string[]): unknown {
  return {
    markets,
    operation: 'unsubscribe',
  };
}

function marketMatcherFor(
  subscription: MarketSubscription,
): (event: MarketEvent) => boolean {
  return (event) => {
    switch (event.type) {
      case 'price_change':
        return event.payload.priceChanges.some((change) =>
          subscription.tokenIds.includes(change.tokenId),
        );
      case 'new_market':
        return subscription.customFeatureEnabled === true;
      case 'market_resolved':
        return (
          subscription.customFeatureEnabled === true &&
          (event.payload.tokenIds ?? []).some((tokenId) =>
            subscription.tokenIds.includes(tokenId),
          )
        );
      case 'best_bid_ask':
        return (
          subscription.customFeatureEnabled === true &&
          subscription.tokenIds.includes(event.payload.tokenId)
        );
      default:
        return subscription.tokenIds.includes(event.payload.tokenId);
    }
  };
}

function userMatcherFor(
  subscription: UserSubscription,
): (event: UserEvent) => boolean {
  if (isAllMarketsUserSubscription(subscription)) {
    return () => true;
  }

  const markets = new Set(
    (subscription.markets ?? []).map((market) => market.toLowerCase()),
  );
  return (event) => markets.has(event.payload.market.toLowerCase());
}

function isAllMarketsUserSubscription(subscription: UserSubscription): boolean {
  return (subscription.markets?.length ?? 0) === 0;
}

function difference(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}
