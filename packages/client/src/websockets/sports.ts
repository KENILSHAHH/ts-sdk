import type { SportsEvent } from '@polymarket/bindings/subscriptions';
import type {
  SportsSubscription,
  SubscriptionHandle,
} from '../actions/subscriptions';
import type { WebSocketManager } from './types';

/**
 * Sports WebSocket manager.
 *
 * Implements {@link WebSocketManager} with `TSpec = SportsSubscription` and
 * `TEvent = SportsEvent`.
 */
export class SportsWebSocketManager
  implements WebSocketManager<SportsSubscription, SportsEvent>
{
  async subscribe(
    _subscription: SportsSubscription,
  ): Promise<SubscriptionHandle<SportsEvent>> {
    // TODO: implement subscription routing, reconnect, and event decoding.
    throw new Error('SportsWebSocketManager.subscribe is not implemented yet.');
  }

  async close(): Promise<void> {
    // TODO: close the upstream socket. Idempotent by contract.
  }
}
