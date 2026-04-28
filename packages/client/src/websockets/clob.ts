import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import {
  type MarketEvent,
  MarketEventSchema,
  type UserEvent,
  UserEventSchema,
} from '@polymarket/bindings/subscriptions';
import type {
  MarketSubscription,
  SubscriptionHandle,
  UserSubscription,
} from '../actions/subscriptions';
import { createSubscriptionHandle } from './handle';
import {
  ClientPingHeartbeat,
  ReconnectScheduler,
  WebSocketConnection,
  type WebSocketConnectionResult,
} from './lifecycle';
import {
  SubscriptionRegistry,
  type SubscriptionRegistryChange,
  type SubscriptionRegistryEntry,
} from './registry';
import type { WebSocketManager } from './types';

type MarketSubscriptionEntry = SubscriptionRegistryEntry<
  MarketSubscription,
  MarketEvent
>;

type MarketServerSubscription = {
  assetsIds: string[];
  customFeatureEnabled: boolean;
};

type UserSubscriptionEntry = SubscriptionRegistryEntry<
  UserSubscription,
  UserEvent
>;

type UserServerSubscription = {
  includeAllMarkets: boolean;
  markets: string[];
};

type ApiKeyCredsProvider = () => ApiKeyCreds | Promise<ApiKeyCreds>;

type SendWebSocketMessage = (message: string) => void;

export type ClobMarketWebSocketManagerOptions = {
  url: string;
};

export type ClobUserWebSocketManagerOptions = {
  resolveCredentials: ApiKeyCredsProvider;
  url: string;
};

const HEARTBEAT_INTERVAL_MS = 10_000;
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
  #closing: Promise<void> | undefined;
  readonly #connection = new WebSocketConnection();
  readonly #heartbeat = new ClientPingHeartbeat({
    interval: HEARTBEAT_INTERVAL_MS,
    message: 'PING',
  });
  readonly #reconnectScheduler: ReconnectScheduler;
  readonly #subscriptions = new SubscriptionRegistry<
    MarketSubscription,
    MarketEvent,
    MarketServerSubscription
  >({ deriveServerState: deriveMarketServerSubscription });

  constructor(options: ClobMarketWebSocketManagerOptions) {
    this.#url = options.url;
    this.#reconnectScheduler = new ReconnectScheduler({
      baseDelayMs: RECONNECT_BASE_DELAY_MS,
      maxDelayMs: RECONNECT_MAX_DELAY_MS,
    });
  }

  async subscribe(
    subscription: MarketSubscription,
  ): Promise<SubscriptionHandle<MarketEvent>> {
    const { change, entry } = this.#subscriptions.add(subscription, {
      matches: marketMatcherFor(subscription),
    });

    await this.#registerSubscriber(entry, change);
    return createSubscriptionHandle(entry.subscriber.queue, () =>
      this.#closeSubscriber(entry),
    );
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(
    entry: MarketSubscriptionEntry,
    change: SubscriptionRegistryChange<MarketServerSubscription>,
  ): Promise<void> {
    const { before, after } = change;

    try {
      const connection = await this.#connect();
      if (connection.reusedOpenSocket) {
        syncMarketSubscription(
          (message) => this.#connection.send(message),
          before,
          after,
        );
      }
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
  }

  async #closeSubscriber(entry: MarketSubscriptionEntry): Promise<void> {
    const { before, after } = this.#subscriptions.remove(entry);

    if (!this.#subscriptions.hasActiveSubscriptions()) {
      await this.close();
      return;
    }

    syncMarketSubscription(
      (message) => this.#connection.send(message),
      before,
      after,
    );
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
    this.#reconnectScheduler.stop();
    this.#subscriptions.endAll();

    await this.#connection.close();
  }

  #connect(): Promise<WebSocketConnectionResult> {
    return this.#connection.connect({
      onClose: () => this.#onConnectionClose(),
      onError: () => this.#onConnectionError(),
      onMessage: (event) => this.#onConnectionMessage(event),
      onOpen: () => this.#onConnectionOpen(),
      openErrorMessage: 'CLOB market WebSocket failed to open.',
      url: this.#url,
    });
  }

  #onConnectionOpen(): void {
    this.#reconnectScheduler.resetBackoff();
    this.#sendInitialSubscription();
    this.#startHeartbeat();
  }

  #onConnectionMessage(event: MessageEvent): void {
    const data = String(event.data);
    if (data === 'PONG') {
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
      this.#subscriptions.dispatch(parsed.data);
    }
  }

  #onConnectionClose(): void {
    this.#stopHeartbeat();
    if (this.#subscriptions.hasActiveSubscriptions()) {
      this.#scheduleReconnect();
    }
  }

  #onConnectionError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  // Heartbeat.

  #startHeartbeat(): void {
    this.#heartbeat.start(this.#connection);
  }

  #stopHeartbeat(): void {
    this.#heartbeat.stop();
  }

  // CLOB market subscribe/unsubscribe frames.

  #sendInitialSubscription(): void {
    this.#connection.send(
      JSON.stringify(
        buildMarketSubscribeMessage(this.#activeServerSubscription()),
      ),
    );
  }

  #activeServerSubscription(): MarketServerSubscription {
    return this.#subscriptions.serverState();
  }

  #scheduleReconnect(): void {
    this.#reconnectScheduler.schedule({
      reconnect: () => this.#connect(),
      shouldReconnect: () => this.#subscriptions.hasActiveSubscriptions(),
    });
  }
}

export class ClobUserWebSocketManager
  implements WebSocketManager<UserSubscription, UserEvent>
{
  readonly #url: string;
  readonly #resolveCredentials: ApiKeyCredsProvider;
  #closing: Promise<void> | undefined;
  readonly #connection = new WebSocketConnection();
  readonly #heartbeat = new ClientPingHeartbeat({
    interval: HEARTBEAT_INTERVAL_MS,
    message: 'PING',
  });
  readonly #reconnectScheduler: ReconnectScheduler;
  readonly #subscriptions = new SubscriptionRegistry<
    UserSubscription,
    UserEvent,
    UserServerSubscription
  >({ deriveServerState: deriveUserServerSubscription });

  constructor(options: ClobUserWebSocketManagerOptions) {
    this.#url = options.url;
    this.#resolveCredentials = options.resolveCredentials;
    this.#reconnectScheduler = new ReconnectScheduler({
      baseDelayMs: RECONNECT_BASE_DELAY_MS,
      maxDelayMs: RECONNECT_MAX_DELAY_MS,
    });
  }

  async subscribe(
    subscription: UserSubscription,
  ): Promise<SubscriptionHandle<UserEvent>> {
    const { change, entry } = this.#subscriptions.add(subscription, {
      matches: userMatcherFor(subscription),
    });

    await this.#registerSubscriber(entry, change);
    return createSubscriptionHandle(entry.subscriber.queue, () =>
      this.#closeSubscriber(entry),
    );
  }

  // Subscription handle lifecycle.

  async #registerSubscriber(
    entry: UserSubscriptionEntry,
    change: SubscriptionRegistryChange<UserServerSubscription>,
  ): Promise<void> {
    const { before, after } = change;

    try {
      const connection = await this.#connect();
      if (connection.reusedOpenSocket) {
        syncUserSubscription(
          (message) => this.#connection.send(message),
          before,
          after,
        );
      }
    } catch (error) {
      await this.#closeSubscriber(entry);
      throw error;
    }
  }

  async #closeSubscriber(entry: UserSubscriptionEntry): Promise<void> {
    const { before, after } = this.#subscriptions.remove(entry);

    if (!this.#subscriptions.hasActiveSubscriptions()) {
      await this.close();
      return;
    }

    syncUserSubscription(
      (message) => this.#connection.send(message),
      before,
      after,
    );
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
    this.#reconnectScheduler.stop();
    this.#subscriptions.endAll();

    await this.#connection.close();
  }

  #connect(): Promise<WebSocketConnectionResult> {
    return this.#connection.connect({
      onClose: () => this.#onConnectionClose(),
      onError: () => this.#onConnectionError(),
      onMessage: (event) => this.#onConnectionMessage(event),
      onOpen: (credentials) => this.#onConnectionOpen(credentials),
      openErrorMessage: 'CLOB user WebSocket failed to open.',
      prepare: () => this.#resolveCredentials(),
      url: this.#url,
    });
  }

  #onConnectionOpen(credentials: ApiKeyCreds): void {
    this.#reconnectScheduler.resetBackoff();
    this.#sendInitialSubscription(credentials);
    this.#startHeartbeat();
  }

  #onConnectionMessage(event: MessageEvent): void {
    const data = String(event.data);
    if (data === 'PONG') {
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
      this.#subscriptions.dispatch(parsed.data);
    }
  }

  #onConnectionClose(): void {
    this.#stopHeartbeat();
    if (this.#subscriptions.hasActiveSubscriptions()) {
      this.#scheduleReconnect();
    }
  }

  #onConnectionError(): void {
    // Browser WebSockets report most failures as an error followed by close.
    // Keep iterators alive here so the close path can reconnect active handles.
  }

  // Heartbeat.

  #startHeartbeat(): void {
    this.#heartbeat.start(this.#connection);
  }

  #stopHeartbeat(): void {
    this.#heartbeat.stop();
  }

  // CLOB user subscribe/unsubscribe frames.

  #sendInitialSubscription(credentials: ApiKeyCreds): void {
    this.#connection.send(
      JSON.stringify(
        buildUserSubscribeMessage(
          this.#activeServerSubscription(),
          credentials,
        ),
      ),
    );
  }

  #activeServerSubscription(): UserServerSubscription {
    return this.#subscriptions.serverState();
  }

  #scheduleReconnect(): void {
    this.#reconnectScheduler.schedule({
      reconnect: () => this.#connect(),
      shouldReconnect: () => this.#subscriptions.hasActiveSubscriptions(),
    });
  }
}

function syncMarketSubscription(
  send: SendWebSocketMessage,
  before: MarketServerSubscription,
  after: MarketServerSubscription,
): void {
  const addedAssets = difference(after.assetsIds, before.assetsIds);
  const removedAssets = difference(before.assetsIds, after.assetsIds);

  if (addedAssets.length > 0) {
    send(
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
    send(
      JSON.stringify(
        buildMarketSubscribeUpdate(
          [firstActiveAsset],
          after.customFeatureEnabled,
        ),
      ),
    );
  }
  if (removedAssets.length > 0) {
    send(JSON.stringify(buildMarketUnsubscribeUpdate(removedAssets)));
  }
}

function syncUserSubscription(
  send: SendWebSocketMessage,
  before: UserServerSubscription,
  after: UserServerSubscription,
): void {
  if (after.includeAllMarkets) {
    if (!before.includeAllMarkets && before.markets.length > 0) {
      send(JSON.stringify(buildUserUnsubscribeUpdate(before.markets)));
    }
    return;
  }

  if (before.includeAllMarkets) {
    if (after.markets.length > 0) {
      send(JSON.stringify(buildUserSubscribeUpdate(after.markets)));
    }
    return;
  }

  const addedMarkets = difference(after.markets, before.markets);
  const removedMarkets = difference(before.markets, after.markets);

  if (addedMarkets.length > 0) {
    send(JSON.stringify(buildUserSubscribeUpdate(addedMarkets)));
  }
  if (removedMarkets.length > 0) {
    send(JSON.stringify(buildUserUnsubscribeUpdate(removedMarkets)));
  }
}

function deriveMarketServerSubscription(
  entries: Iterable<MarketSubscriptionEntry>,
): MarketServerSubscription {
  const assets = new Set<string>();
  let customFeatureEnabled = false;
  for (const { subscription } of entries) {
    for (const tokenId of subscription.tokenIds) assets.add(tokenId);
    customFeatureEnabled ||= subscription.customFeatureEnabled === true;
  }
  return { assetsIds: Array.from(assets), customFeatureEnabled };
}

function deriveUserServerSubscription(
  entries: Iterable<UserSubscriptionEntry>,
): UserServerSubscription {
  let includeAllMarkets = false;
  const markets = new Set<string>();
  for (const { subscription } of entries) {
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
