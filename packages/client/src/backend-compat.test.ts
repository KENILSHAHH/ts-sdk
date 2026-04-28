import { CommentParentEntityType } from '@polymarket/bindings';
import { expectPresent } from '@polymarket/types';
import { describe, it } from 'vitest';
import {
  expectNonEmptyPage,
  findHighVolumeLowPriceMarket,
  publicClient,
  runBackendCompatTests,
} from './testing';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe.runIf(runBackendCompatTests)('backend compatibility', () => {
  it('validates market responses against the response schemas', async () => {
    const paginator = publicClient.listMarkets({
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }

    await publicClient.fetchMarket({ id: firstPage.items[0].id });
  });

  it('validates event responses against the response schemas', async () => {
    const paginator = publicClient.listEvents({
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }

    await publicClient.fetchEvent({ id: firstPage.items[0].id });
  });

  it('validates tag responses against the response schemas', async () => {
    const paginator = publicClient.listTags({
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }

    await publicClient.fetchTag({ id: firstPage.items[0].id });
  });

  it('validates series responses against the response schemas', async () => {
    const paginator = publicClient.listSeries({
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }

    await publicClient.fetchSeries({ id: firstPage.items[0].id });
  });

  it('validates comment responses against the response schemas', async () => {
    const {
      items: [event],
    } = await publicClient
      .listEvents({
        closed: false,
        pageSize: 1,
      })
      .firstPage()
      .then(expectNonEmptyPage);
    const paginator = publicClient.listComments({
      parentEntityId: event.id,
      parentEntityType: CommentParentEntityType.Event,
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage();

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }

    const comment = firstPage.items[0];
    if (comment !== undefined) {
      await publicClient.fetchCommentsById({ id: comment.id });
    }
  });

  it('validates public profile responses against the response schema', async () => {
    await publicClient.fetchPublicProfile({
      address: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
    });
  });

  it('validates search responses against the response schema', async () => {
    await publicClient.search({
      limitPerType: 10,
      q: 'polymarket',
      searchProfiles: true,
      searchTags: true,
    });
  });

  it('validates sports metadata against the response schema', async () => {
    await publicClient.listSports();
  });

  it('validates team responses against the response schema', async () => {
    const paginator = publicClient.listTeams({
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }
  });

  it('validates trade responses against the response schema', async () => {
    const paginator = publicClient.listTrades({
      pageSize: 100,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 29;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }
  });

  it('validates activity responses against the response schema', async () => {
    const paginator = publicClient.listActivity({
      pageSize: 100,
      type: ['TRADE'],
      user: TEST_USER,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 29;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }
  });

  it('validates position responses against the response schema', async () => {
    const paginator = publicClient.listPositions({
      pageSize: 100,
      user: TEST_USER,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }
  });

  it('validates closed position responses against the response schema', async () => {
    const paginator = publicClient.listClosedPositions({
      pageSize: 100,
      user: TEST_USER,
    });
    const firstPage = await paginator.firstPage().then(expectNonEmptyPage);

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }
  });

  it('validates builder volume responses against the response schema', async () => {
    await publicClient.fetchBuilderVolume({
      timePeriod: 'DAY',
    });
  });

  it('validates order book responses against the response schema', async () => {
    const market = await findHighVolumeLowPriceMarket();
    const [tokenId] = expectPresent(market.clobTokenIds);

    await publicClient.fetchOrderBook({ tokenId });
    await publicClient.fetchOrderBooks([{ tokenId }]);
  });

  it('validates reward responses against the response schemas', async () => {
    const paginator = publicClient.listCurrentRewards();
    const firstPage = await paginator.firstPage();

    let remainingPages = 99;

    for await (const _page of paginator.from(firstPage.nextCursor)) {
      if (--remainingPages === 0) {
        break;
      }
    }

    const currentReward = firstPage.items[0];
    if (currentReward === undefined) {
      return;
    }

    const marketRewards = publicClient.listMarketRewards({
      conditionId: currentReward.conditionId,
    });
    const marketRewardsFirstPage = await marketRewards.firstPage();

    remainingPages = 99;

    for await (const _page of marketRewards.from(
      marketRewardsFirstPage.nextCursor,
    )) {
      if (--remainingPages === 0) {
        break;
      }
    }
  });
});
