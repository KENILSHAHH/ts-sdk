import type { Pushable } from 'it-pushable';

export type SubscriptionRegistrySubscriber<TEvent> = {
  matches?: (event: TEvent) => boolean;
  queue: Pushable<TEvent>;
};

export type SubscriptionRegistryEntry<TSubscription, TEvent> = {
  subscription: TSubscription;
  subscriber: SubscriptionRegistrySubscriber<TEvent>;
};

export type SubscriptionRegistryChange<TState> = {
  before: TState;
  after: TState;
};

export type SubscriptionRegistryOptions<TSubscription, TEvent, TState> = {
  deriveServerState: (
    entries: Iterable<SubscriptionRegistryEntry<TSubscription, TEvent>>,
  ) => TState;
};

export class SubscriptionRegistry<TSubscription, TEvent, TState> {
  readonly #entries = new Set<
    SubscriptionRegistryEntry<TSubscription, TEvent>
  >();
  readonly #deriveServerState: (
    entries: Iterable<SubscriptionRegistryEntry<TSubscription, TEvent>>,
  ) => TState;

  constructor(
    options: SubscriptionRegistryOptions<TSubscription, TEvent, TState>,
  ) {
    this.#deriveServerState = options.deriveServerState;
  }

  add(
    entry: SubscriptionRegistryEntry<TSubscription, TEvent>,
  ): SubscriptionRegistryChange<TState> {
    const before = this.serverState();
    this.#entries.add(entry);
    return { before, after: this.serverState() };
  }

  remove(
    entry: SubscriptionRegistryEntry<TSubscription, TEvent>,
  ): SubscriptionRegistryChange<TState> {
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

  hasActiveSubscriptions(): boolean {
    return this.#entries.size > 0;
  }

  endAll(error?: Error): void {
    for (const { subscriber } of this.#entries) {
      subscriber.queue.end(error);
    }
    this.#entries.clear();
  }

  serverState(): TState {
    return this.#deriveServerState(this.#entries);
  }
}
