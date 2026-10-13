import {
  type LegacyOrderHeartbeat,
  LegacyOrderHeartbeatSchema,
  type OrderHeartbeat,
  OrderHeartbeatSchema,
} from '@polymarket/bindings/clob';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { BaseSecureClient } from '../clients';
import {
  makeErrorGuard,
  OrderHeartbeatMismatchError,
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';

const SendOrderHeartbeatRequestSchema = z.object({
  heartbeatId: z.string().default(''),
});
export type SendOrderHeartbeatRequest = z.input<
  typeof SendOrderHeartbeatRequestSchema
>;
export type SendOrderHeartbeatError =
  | OrderHeartbeatMismatchError
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const SendOrderHeartbeatError = makeErrorGuard(
  OrderHeartbeatMismatchError,
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Sends one authenticated order heartbeat and returns the next heartbeat ID.
 * The first accepted send enables timeout cancellation for ALL open orders owned
 * by this API key, across markets and processes. Only start when you can keep
 * sending every five seconds. After ten seconds without an accepted send, the
 * server attempts cancel-all; cancellation timing and success are not guaranteed.
 * Start with an empty ID, serialize sends per key, and retain every returned ID.
 * No timer or automatic retry is started. A mismatch does not refresh the deadline;
 * retry explicitly with OrderHeartbeatMismatchError.heartbeatId. A lost response
 * may follow an accepted send, so failure does not prove registration is inactive.
 * There is no disarm operation. Stopping sends or closing the client leaves the
 * deadline active. On shutdown, stop placing orders and explicitly cancel/verify
 * orders you intend to remove. Expiry removes the registration; a later accepted
 * send registers again. This is separate from WebSocket connection keepalive.
 * @throws {@link SendOrderHeartbeatError} Thrown on failure.
 * @example
 * ```ts
 * const heartbeat = await sendOrderHeartbeat(client);
 * const next = await sendOrderHeartbeat(client, { heartbeatId: heartbeat.heartbeatId });
 * ```
 */
export async function sendOrderHeartbeat(
  client: BaseSecureClient,
  request: SendOrderHeartbeatRequest = {},
): Promise<OrderHeartbeat> {
  const { heartbeatId } = parseUserInput(
    request,
    SendOrderHeartbeatRequestSchema,
  );
  return unwrap(
    client.secureClob
      .post('/v1/heartbeats', {
        json: { heartbeat_id: heartbeatId },
        retry: false,
      })
      .andThen(validateWith(OrderHeartbeatSchema)),
  );
}

export type SendLegacyOrderHeartbeatError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;
export const SendLegacyOrderHeartbeatError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
);
/**
 * Sends one authenticated legacy order heartbeat without ID tracking.
 * The first accepted send enables timeout cancellation for ALL open orders owned
 * by this API key. Keep sending every five seconds; after ten seconds without an
 * accepted send, the server attempts cancel-all with no success/timing guarantee.
 * Shares the key's registration with sendOrderHeartbeat and resets its expected
 * ID to empty. Coordinate one sender per key. No timer or automatic retry starts.
 * There is no disarm operation: stopping sends or closing the client leaves the
 * deadline active. A lost response may follow an accepted send. Stop placing
 * orders and explicitly cancel/verify orders you intend to remove on shutdown.
 * Expiry removes the registration; later accepted sends register again.
 * @throws {@link SendLegacyOrderHeartbeatError} Thrown on failure.
 */
export async function sendLegacyOrderHeartbeat(
  client: BaseSecureClient,
): Promise<LegacyOrderHeartbeat> {
  return unwrap(
    client.secureClob
      .post('/heartbeats', { retry: false })
      .andThen(validateWith(LegacyOrderHeartbeatSchema)),
  );
}
