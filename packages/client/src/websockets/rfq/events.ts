import {
  type RfqConfirmationAck as BindingRfqConfirmationAck,
  type RfqQuoteAck as BindingRfqQuoteAck,
  RfqConfirmationDecision,
  type RfqConfirmationRequest,
  type RfqExecutionUpdate,
  type RfqId,
  type RfqQuoteId,
  type RfqQuoteRequest,
} from '@polymarket/bindings/rfq';
import type {
  RfqConfirmationAck,
  RfqConfirmationRequestEvent,
  RfqExecutionUpdateEvent,
  RfqQuoteAck,
  RfqQuoteRequestEvent,
  RfqQuoteResponse,
} from '../../actions/rfq';

export interface RfqEventController {
  quote(
    request: RfqQuoteRequest,
    response: RfqQuoteResponse,
  ): Promise<RfqQuoteAck>;
  respondToConfirmation(
    rfqId: RfqId,
    quoteId: RfqQuoteId,
    decision: RfqConfirmationDecision,
  ): Promise<RfqConfirmationAck>;
}

export function toQuoteRequestEvent(
  controller: RfqEventController,
  message: RfqQuoteRequest,
): RfqQuoteRequestEvent {
  return {
    ...message,
    quote: (request) => controller.quote(message, request),
  };
}

export function toConfirmationRequestEvent(
  controller: RfqEventController,
  message: RfqConfirmationRequest,
): RfqConfirmationRequestEvent {
  const rfqId = message.rfqId;
  const quoteId = message.quoteId;
  return {
    ...message,
    confirm: () =>
      controller.respondToConfirmation(
        rfqId,
        quoteId,
        RfqConfirmationDecision.Confirm,
      ),
    decline: () =>
      controller.respondToConfirmation(
        rfqId,
        quoteId,
        RfqConfirmationDecision.Decline,
      ),
  };
}

export function toExecutionUpdateEvent(
  message: RfqExecutionUpdate,
): RfqExecutionUpdateEvent {
  return message;
}

export function toQuoteAck(message: BindingRfqQuoteAck): RfqQuoteAck {
  return {
    quoteId: message.quoteId,
    rfqId: message.rfqId,
  };
}

export function toConfirmationAck(
  message: BindingRfqConfirmationAck,
): RfqConfirmationAck {
  return {
    quoteId: message.quoteId,
    rfqId: message.rfqId,
  };
}
