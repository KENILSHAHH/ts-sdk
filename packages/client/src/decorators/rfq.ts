import { openRfqSession, type RfqSession } from '../actions';
import type { BaseSecureClient } from '../clients';

export type SecureRfqActions = {
  /**
   * Opens an RFQ event session.
   *
   * @remarks
   * The returned async iterator is a stream, not a worker queue. Await inside the
   * loop to process RFQ events sequentially, or dispatch handlers without awaiting
   * them to fan out handling when quote windows are tight.
   *
   * @example
   * Quote the full requested size:
   * ```ts
   * const session = await client.openRfqSession();
   *
   * for await (const event of session) {
   *   switch (event.type) {
   *     case 'quote_request':
   *       await event.quote({ price: 0.45 });
   *       break;
   *
   *     case 'execution_update':
   *       // event.rfqId: RfqId
   *       // event.status: RfqExecutionStatus
   *       // event.txHash: TxHash | undefined
   *       break;
   *   }
   * }
   * ```
   *
   * @example
   * Quote a specific size:
   * ```ts
   * const session = await client.openRfqSession();
   *
   * for await (const event of session) {
   *   switch (event.type) {
   *     case 'quote_request':
   *       await event.quote({ price: 0.45, size: 0.5 });
   *       break;
   *
   *     // …
   *   }
   * }
   * ```
   *
   * @example
   * Handle Last Look confirmation requests:
   * ```ts
   * const session = await client.openRfqSession();
   *
   * for await (const event of session) {
   *   switch (event.type) {
   *     case 'quote_request':
   *       await event.quote({ price: 0.45 });
   *       break;
   *
   *     case 'confirmation_request':
   *       await event.confirm();
   *       break;
   *
   *     // …
   *   }
   * }
   * ```
   * Any maker can quote permissionlessly. Last Look confirmation requests are
   * only sent to makers with Last Look enabled.
   *
   * @example
   * Choose collateral or inventory per request:
   * ```ts
   * const session = await client.openRfqSession();
   *
   * for await (const event of session) {
   *   switch (event.type) {
   *     case 'quote_request': {
   *       switch (event.direction) {
   *         case RfqDirection.Buy:
   *           await event.quote({
   *             price: 0.45,
   *             source: chooseSource(event.yesPositionId, event.size),
   *           });
   *           break;
   *
   *         case RfqDirection.Sell:
   *           await event.quote({
   *             price: 0.45,
   *             source: chooseSource(event.noPositionId, event.size),
   *           });
   *           break;
   *       }
   *       break;
   *     }
   *
   *     case 'confirmation_request':
   *       await event.confirm();
   *       break;
   *
   *     // …
   *   }
   * }
   *
   * function chooseSource(positionId: PositionId, size: DecimalString): RfqQuoteSource {
   *   return hasInventory(positionId, size) ? 'inventory' : 'collateral';
   * }
   * ```
   *
   * @throws {@link OpenRfqSessionError}
   * Thrown on failure.
   */
  openRfqSession(): Promise<RfqSession>;
};

export function rfqActions(client: BaseSecureClient): SecureRfqActions {
  return {
    openRfqSession() {
      return openRfqSession(client);
    },
  };
}
