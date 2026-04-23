import type { SubscriptionHandle } from '../actions/subscriptions';
import type { WebSocketManager } from './types';

/**
 * Shared CLOB WebSocket manager.
 *
 * Implements {@link WebSocketManager} for both the public market stream
 * (`TSpec = MarketSubscription`, `TEvent = MarketEvent`) and the authenticated
 * user stream (`TSpec = UserSubscription`, `TEvent = UserEvent`).
 */
export class ClobWebSocketManager<TSpec, TEvent>
  implements WebSocketManager<TSpec, TEvent>
{
  async subscribe(_subscription: TSpec): Promise<SubscriptionHandle<TEvent>> {
    // TODO: implement subscription routing, reconnect, and event decoding.
    throw new Error('ClobWebSocketManager.subscribe is not implemented yet.');
  }

  async close(): Promise<void> {
    // TODO: close the upstream socket. Idempotent by contract.
  }
}
