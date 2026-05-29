import type {
  RfqConfirmationAck,
  RfqConfirmationRequest,
  RfqDirection,
  RfqExecutionUpdate,
  RfqQuoteAck,
  RfqQuoteRequest,
  RfqSide,
} from '@polymarket/bindings/rfq';
import type { BaseSecureClient } from '../clients';
import { makeErrorGuard, TransportError, UserInputError } from '../errors';

export type {
  RfqConfirmationAck,
  RfqConfirmationRequest,
  RfqDirection,
  RfqExecutionUpdate,
  RfqQuoteAck,
  RfqQuoteRequest,
  RfqSide,
};

export type RfqQuoteResponse = {
  /** Quote price, for example `0.45` or `"0.45"`. */
  price: number | string;

  /**
   * Optional quote size. When omitted, the quote uses the full RFQ request size.
   */
  size?: number | string;
};

/**
 * Server request asking the market maker to provide a quote for an RFQ.
 */
export interface RfqQuoteRequestEvent extends RfqQuoteRequest {
  /**
   * Sends a quote response for this RFQ request.
   */
  quote(response: RfqQuoteResponse): Promise<RfqQuoteAck>;
}

/**
 * Server request asking the market maker to confirm or decline a selected quote.
 */
export interface RfqConfirmationRequestEvent extends RfqConfirmationRequest {
  /**
   * Confirms that the maker wants to proceed with the selected quote.
   */
  confirm(): Promise<RfqConfirmationAck>;

  /**
   * Declines the selected quote during the confirmation window.
   */
  decline(): Promise<RfqConfirmationAck>;
}

/**
 * Execution status update for an RFQ after acceptance and handoff.
 */
export interface RfqExecutionUpdateEvent extends RfqExecutionUpdate {}

/**
 * Event emitted by an RFQ session.
 */
export type RfqEvent =
  | RfqQuoteRequestEvent
  | RfqConfirmationRequestEvent
  | RfqExecutionUpdateEvent;

export interface RfqSession extends AsyncIterable<RfqEvent> {
  /**
   * Closes the RFQ quoter stream.
   */
  close(): Promise<void>;
}

export type OpenRfqSessionError = TransportError | UserInputError;
export const OpenRfqSessionError = makeErrorGuard(
  TransportError,
  UserInputError,
);

/**
 * Opens an RFQ event session.
 *
 * @remarks
 * The returned async iterator is a stream, not a worker queue. Await inside the
 * loop to process RFQ events sequentially, or dispatch handlers without awaiting
 * them to fan out handling when quote windows are tight.
 *
 * @throws {@link OpenRfqSessionError}
 * Thrown on failure.
 */
export async function openRfqSession(
  client: BaseSecureClient,
): Promise<RfqSession> {
  return client.webSockets.rfqQuoter.connect();
}
