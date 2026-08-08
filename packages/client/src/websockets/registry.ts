import { type Pushable, pushable } from 'it-pushable';
import type { SubscriptionResyncEvent } from '../actions/subscriptions';

const SUBSCRIPTION_RESYNC_EVENT: SubscriptionResyncEvent = {
  topic: 'subscription',
  type: 'resync',
  reason: 'reconnect',
};

export type SubscriptionRegistrySubscriber<TEvent> = {
  matches?: (event: TEvent) => boolean;
  queue: Pushable<TEvent | SubscriptionResyncEvent>;
};

export type SubscriptionRegistryEntry<TSubscription, TEvent> = {
  subscription: TSubscription;
  subscriber: SubscriptionRegistrySubscriber<TEvent>;
};

export type SubscriptionRegistryChange<TState> = {
  before: TState;
  after: TState;
};

export type SubscriptionRegistryAddOptions<TEvent> = {
  matches?: (event: TEvent) => boolean;
};

export type SubscriptionRegistryAddResult<TSubscription, TEvent, TState> = {
  change: SubscriptionRegistryChange<TState>;
  entry: SubscriptionRegistryEntry<TSubscription, TEvent>;
};

type DeriveServerState<TSubscription, TEvent, TState> = (
  entries: Iterable<SubscriptionRegistryEntry<TSubscription, TEvent>>,
) => TState;

export type SubscriptionRegistryOptions<TSubscription, TEvent, TState> = {
  deriveServerState: DeriveServerState<TSubscription, TEvent, TState>;
};

export class SubscriptionRegistry<
  TSubscription,
  TEvent,
  TServerState = undefined,
> {
  readonly #entries = new Set<
    SubscriptionRegistryEntry<TSubscription, TEvent>
  >();
  readonly #deriveServerState: DeriveServerState<
    TSubscription,
    TEvent,
    TServerState
  >;

  constructor(
    options?: SubscriptionRegistryOptions<TSubscription, TEvent, TServerState>,
  ) {
    this.#deriveServerState =
      options?.deriveServerState ?? (() => undefined as TServerState);
  }

  add(
    subscription: TSubscription,
    options: SubscriptionRegistryAddOptions<TEvent> = {},
  ): SubscriptionRegistryAddResult<TSubscription, TEvent, TServerState> {
    const subscriber: SubscriptionRegistrySubscriber<TEvent> = {
      queue: pushable<TEvent>({ objectMode: true }),
    };
    if (options.matches !== undefined) {
      subscriber.matches = options.matches;
    }
    const entry: SubscriptionRegistryEntry<TSubscription, TEvent> = {
      subscription,
      subscriber,
    };
    return { change: this.#addEntry(entry), entry };
  }

  #addEntry(
    entry: SubscriptionRegistryEntry<TSubscription, TEvent>,
  ): SubscriptionRegistryChange<TServerState> {
    const before = this.serverState();
    this.#entries.add(entry);
    return { before, after: this.serverState() };
  }

  remove(
    entry: SubscriptionRegistryEntry<TSubscription, TEvent>,
  ): SubscriptionRegistryChange<TServerState> {
    const before = this.serverState();
    this.#entries.delete(entry);
    entry.subscriber.queue.end();
    return { before, after: this.serverState() };
  }

  dispatch(event: TEvent): void {
    for (const { subscriber } of this.#entries) {
      if (subscriber.matches === undefined || subscriber.matches(event)) {
        subscriber.queue.push(event);
      }
    }
  }

  /**
   * Delivers a resync event to every active subscriber, bypassing matchers:
   * a delivery gap affects every subscription on the connection regardless
   * of its event filters.
   */
  resyncAll(): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.push(SUBSCRIPTION_RESYNC_EVENT);
    }
  }

  hasActiveSubscriptions(): boolean {
    return this.#entries.size > 0;
  }

  endAll(error?: Error): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.end(error);
    }
    this.#entries.clear();
  }

  serverState(): TServerState {
    return this.#deriveServerState(this.#entries);
  }
}
