import type { Pushable } from 'it-pushable';
import type { SubscriptionHandle } from '../actions/subscriptions';

export function createSubscriptionHandle<TEvent>(
  queue: Pushable<TEvent>,
  closeSubscription: () => Promise<void>,
): SubscriptionHandle<TEvent> {
  let closing: Promise<void> | undefined;

  return {
    close: () => {
      if (closing === undefined) {
        closing = closeSubscription();
      }
      return closing;
    },
    [Symbol.asyncIterator]() {
      return queue[Symbol.asyncIterator]();
    },
  };
}
