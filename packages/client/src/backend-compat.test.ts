import { CommentParentEntityType } from '@polymarket/bindings';
import { describe, it } from 'vitest';
import {
  expectNonEmptyPage,
  publicClient,
  runBackendCompatTests,
} from './testing';

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
});
