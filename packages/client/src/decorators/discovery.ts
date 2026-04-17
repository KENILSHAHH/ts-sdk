import {
  type FetchEventRequest,
  fetchCommentsById,
  fetchEvent,
  fetchEventTags,
  fetchMarket,
  fetchMarketTags,
  fetchPublicProfile,
  fetchRelatedTagResources,
  fetchRelatedTags,
  fetchSeries,
  fetchSportsMarketTypes,
  fetchTag,
  listComments,
  listCommentsByUserAddress,
  listEvents,
  listMarkets,
  listSeries,
  listSports,
  listTags,
  listTeams,
  search,
} from '../actions';
import type { Client, PublicClient, SecureClient } from '../clients';
import type { BindActionParameters, BindActionResult } from './shared';

export type DiscoveryActions = {
  /**
   * Lists events.
   *
   * @throws {@link ListEventsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listEvents({
   *   pageSize: 10,
   * });
   * ```
   */
  listEvents(
    ...args: BindActionParameters<typeof listEvents>
  ): BindActionResult<typeof listEvents>;

  /**
   * Fetches an event.
   *
   * @throws {@link FetchEventError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const event = await client.fetchEvent({
   *   id: '123',
   * });
   * ```
   */
  fetchEvent(request: FetchEventRequest): BindActionResult<typeof fetchEvent>;

  /**
   * Fetches an event's tags.
   *
   * @throws {@link FetchEventTagsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const tags = await client.fetchEventTags({
   *   id: '123',
   * });
   * ```
   */
  fetchEventTags(
    ...args: BindActionParameters<typeof fetchEventTags>
  ): BindActionResult<typeof fetchEventTags>;

  /**
   * Lists markets.
   *
   * @throws {@link ListMarketsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listMarkets({
   *   closed: false,
   *   pageSize: 10,
   * });
   * ```
   */
  listMarkets(
    ...args: BindActionParameters<typeof listMarkets>
  ): BindActionResult<typeof listMarkets>;

  /**
   * Fetches a market.
   *
   * @throws {@link FetchMarketError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const market = await client.fetchMarket({
   *   id: '12345',
   * });
   * ```
   */
  fetchMarket(
    ...args: BindActionParameters<typeof fetchMarket>
  ): BindActionResult<typeof fetchMarket>;

  /**
   * Fetches a market's tags.
   *
   * @throws {@link FetchMarketTagsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const tags = await client.fetchMarketTags({
   *   id: '12345',
   * });
   * ```
   */
  fetchMarketTags(
    ...args: BindActionParameters<typeof fetchMarketTags>
  ): BindActionResult<typeof fetchMarketTags>;

  /**
   * Lists series.
   *
   * @throws {@link ListSeriesError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listSeries({
   *   pageSize: 10,
   * });
   * ```
   */
  listSeries(
    ...args: BindActionParameters<typeof listSeries>
  ): BindActionResult<typeof listSeries>;

  /**
   * Fetches a series.
   *
   * @throws {@link FetchSeriesError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const series = await client.fetchSeries({
   *   id: '123',
   * });
   * ```
   */
  fetchSeries(
    ...args: BindActionParameters<typeof fetchSeries>
  ): BindActionResult<typeof fetchSeries>;

  /**
   * Lists tags.
   *
   * @throws {@link ListTagsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listTags({
   *   pageSize: 10,
   * });
   * ```
   */
  listTags(
    ...args: BindActionParameters<typeof listTags>
  ): BindActionResult<typeof listTags>;

  /**
   * Fetches a tag by id or slug.
   *
   * @throws {@link FetchTagError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const tag = await client.fetchTag({
   *   slug: 'politics',
   * });
   * ```
   */
  fetchTag(
    ...args: BindActionParameters<typeof fetchTag>
  ): BindActionResult<typeof fetchTag>;

  /**
   * Fetches related tag relationships by id or slug.
   *
   * @throws {@link FetchRelatedTagsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const related = await client.fetchRelatedTags({
   *   slug: 'politics',
   * });
   * ```
   */
  fetchRelatedTags(
    ...args: BindActionParameters<typeof fetchRelatedTags>
  ): BindActionResult<typeof fetchRelatedTags>;

  /**
   * Fetches resources linked from related tag relationships by id or slug.
   *
   * @throws {@link FetchRelatedTagResourcesError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const resources = await client.fetchRelatedTagResources({
   *   slug: 'politics',
   * });
   * ```
   */
  fetchRelatedTagResources(
    ...args: BindActionParameters<typeof fetchRelatedTagResources>
  ): BindActionResult<typeof fetchRelatedTagResources>;

  /**
   * Runs a public full-text search.
   *
   * @throws {@link SearchError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const results = await client.search({
   *   query: 'election',
   * });
   * ```
   */
  search(
    ...args: BindActionParameters<typeof search>
  ): BindActionResult<typeof search>;

  /**
   * Lists available sports metadata.
   *
   * @throws {@link ListSportsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const sports = await client.listSports();
   * ```
   */
  listSports(
    ...args: BindActionParameters<typeof listSports>
  ): BindActionResult<typeof listSports>;

  /**
   * Fetches the available market types grouped by sport.
   *
   * @throws {@link FetchSportsMarketTypesError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const marketTypes = await client.fetchSportsMarketTypes();
   * ```
   */
  fetchSportsMarketTypes(
    ...args: BindActionParameters<typeof fetchSportsMarketTypes>
  ): BindActionResult<typeof fetchSportsMarketTypes>;

  /**
   * Lists teams.
   *
   * @throws {@link ListTeamsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const teams = await client.listTeams();
   * ```
   */
  listTeams(
    ...args: BindActionParameters<typeof listTeams>
  ): BindActionResult<typeof listTeams>;

  /**
   * Fetches a public profile by wallet address.
   *
   * @throws {@link FetchPublicProfileError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const profile = await client.fetchPublicProfile({
   *   address: '0x1234...',
   * });
   * ```
   */
  fetchPublicProfile(
    ...args: BindActionParameters<typeof fetchPublicProfile>
  ): BindActionResult<typeof fetchPublicProfile>;

  /**
   * Lists comments for an event or series.
   *
   * @throws {@link ListCommentsError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listComments({
   *   parentEntityId: '123',
   *   parentEntityType: 'Event',
   *   pageSize: 20,
   * });
   * ```
   */
  listComments(
    ...args: BindActionParameters<typeof listComments>
  ): BindActionResult<typeof listComments>;

  /**
   * Fetches a comment thread by comment id.
   *
   * @throws {@link FetchCommentsByIdError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const thread = await client.fetchCommentsById({
   *   id: '456',
   *   getPositions: true,
   * });
   * ```
   */
  fetchCommentsById(
    ...args: BindActionParameters<typeof fetchCommentsById>
  ): BindActionResult<typeof fetchCommentsById>;

  /**
   * Lists comments written by a wallet address.
   *
   * @throws {@link ListCommentsByUserAddressError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listCommentsByUserAddress({
   *   address: '0x1234...',
   *   pageSize: 10,
   *   order: 'DESC',
   * });
   * ```
   */
  listCommentsByUserAddress(
    ...args: BindActionParameters<typeof listCommentsByUserAddress>
  ): BindActionResult<typeof listCommentsByUserAddress>;
};

export function discoveryActions(client: PublicClient): DiscoveryActions;
export function discoveryActions(client: SecureClient): DiscoveryActions;
export function discoveryActions(client: Client): DiscoveryActions {
  return {
    listEvents: listEvents.bind(null, client),
    fetchEvent: fetchEvent.bind(null, client),
    fetchEventTags: fetchEventTags.bind(null, client),
    listMarkets: listMarkets.bind(null, client),
    fetchMarket: fetchMarket.bind(null, client),
    fetchMarketTags: fetchMarketTags.bind(null, client),
    listSeries: listSeries.bind(null, client),
    fetchSeries: fetchSeries.bind(null, client),
    listTags: listTags.bind(null, client),
    fetchTag: fetchTag.bind(null, client),
    fetchRelatedTags: fetchRelatedTags.bind(null, client),
    fetchRelatedTagResources: fetchRelatedTagResources.bind(null, client),
    search: search.bind(null, client),
    listSports: listSports.bind(null, client),
    fetchSportsMarketTypes: fetchSportsMarketTypes.bind(null, client),
    listTeams: listTeams.bind(null, client),
    fetchPublicProfile: fetchPublicProfile.bind(null, client),
    listComments: listComments.bind(null, client),
    fetchCommentsById: fetchCommentsById.bind(null, client),
    listCommentsByUserAddress: listCommentsByUserAddress.bind(null, client),
  };
}
