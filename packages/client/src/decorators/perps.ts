import type {
  PerpsBook,
  PerpsCandle,
  PerpsFeeScheduleEntry,
  PerpsFundingRate,
  PerpsInstrument,
  PerpsPublicTrade,
  PerpsTicker,
} from '@polymarket/bindings/perps';
import {
  type FetchPerpsBookRequest,
  type FetchPerpsCandlesRequest,
  type FetchPerpsFundingHistoryRequest,
  type FetchPerpsInstrumentsRequest,
  type FetchPerpsTickerRequest,
  type FetchPerpsTickersRequest,
  type FetchPerpsTradesRequest,
  fetchPerpsBook,
  fetchPerpsCandles,
  fetchPerpsFees,
  fetchPerpsFundingHistory,
  fetchPerpsInstruments,
  fetchPerpsTicker,
  fetchPerpsTickers,
  fetchPerpsTrades,
  type OpenPerpsSessionRequest,
  openPerpsSession,
  type PerpsSession,
} from '../actions';
import type {
  BaseClient,
  BasePublicClient,
  BaseSecureClient,
} from '../clients';

export type { PerpsSession, PerpsSessionEvent } from '../actions';

export type PublicPerpsActions = {
  /**
   * Fetches Perps instruments.
   *
   * @throws {@link FetchPerpsInstrumentsError}
   * Thrown on failure.
   */
  fetchPerpsInstruments(
    request?: FetchPerpsInstrumentsRequest,
  ): Promise<PerpsInstrument[]>;

  /**
   * Fetches the current Perps ticker for an instrument.
   *
   * @throws {@link FetchPerpsTickerError}
   * Thrown on failure.
   */
  fetchPerpsTicker(request: FetchPerpsTickerRequest): Promise<PerpsTicker>;

  /**
   * Fetches current Perps tickers.
   *
   * @throws {@link FetchPerpsTickersError}
   * Thrown on failure.
   */
  fetchPerpsTickers(request?: FetchPerpsTickersRequest): Promise<PerpsTicker[]>;

  /**
   * Fetches a Perps order book.
   *
   * @throws {@link FetchPerpsBookError}
   * Thrown on failure.
   */
  fetchPerpsBook(request: FetchPerpsBookRequest): Promise<PerpsBook>;

  /**
   * Fetches Perps candles for an instrument.
   *
   * @throws {@link FetchPerpsCandlesError}
   * Thrown on failure.
   */
  fetchPerpsCandles(request: FetchPerpsCandlesRequest): Promise<PerpsCandle[]>;

  /**
   * Fetches Perps funding-rate history for an instrument.
   *
   * @throws {@link FetchPerpsFundingHistoryError}
   * Thrown on failure.
   */
  fetchPerpsFundingHistory(
    request: FetchPerpsFundingHistoryRequest,
  ): Promise<PerpsFundingRate[]>;

  /**
   * Fetches recent Perps trades for an instrument.
   *
   * @throws {@link FetchPerpsTradesError}
   * Thrown on failure.
   */
  fetchPerpsTrades(
    request: FetchPerpsTradesRequest,
  ): Promise<PerpsPublicTrade[]>;

  /**
   * Fetches the Perps fee schedule.
   *
   * @throws {@link FetchPerpsFeesError}
   * Thrown on failure.
   */
  fetchPerpsFees(): Promise<PerpsFeeScheduleEntry[]>;
};

export type SecurePerpsActions = PublicPerpsActions & {
  /**
   * Opens a Perps account session.
   *
   * @remarks
   * Pass `expiresIn` to create new delegated Perps credentials, or pass existing
   * credentials to validate and resume a previous session.
   *
   * @throws {@link OpenPerpsSessionError}
   * Thrown on failure.
   */
  openPerpsSession(request: OpenPerpsSessionRequest): Promise<PerpsSession>;
};

export type PerpsActions = PublicPerpsActions;

export function perpsActions(client: BasePublicClient): PublicPerpsActions;
export function perpsActions(client: BaseSecureClient): SecurePerpsActions;
export function perpsActions(
  client: BaseClient,
): PublicPerpsActions | SecurePerpsActions {
  const actions: PublicPerpsActions = {
    fetchPerpsBook: (request) => fetchPerpsBook(client, request),
    fetchPerpsCandles: (request) => fetchPerpsCandles(client, request),
    fetchPerpsFees: () => fetchPerpsFees(client),
    fetchPerpsFundingHistory: (request) =>
      fetchPerpsFundingHistory(client, request),
    fetchPerpsInstruments: (request) => fetchPerpsInstruments(client, request),
    fetchPerpsTicker: (request) => fetchPerpsTicker(client, request),
    fetchPerpsTickers: (request) => fetchPerpsTickers(client, request),
    fetchPerpsTrades: (request) => fetchPerpsTrades(client, request),
  };

  if (!client.isSecureClient()) return actions;

  return {
    ...actions,
    openPerpsSession: (request) => openPerpsSession(client, request),
  };
}
