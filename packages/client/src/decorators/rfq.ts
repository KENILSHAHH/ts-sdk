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
