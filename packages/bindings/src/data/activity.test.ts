import { describe, expect, it } from 'vitest';
import { ActivitySchema } from './activity';
import { ActivityType } from './common';

const BASE_ACTIVITY = {
  proxyWallet: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
  timestamp: 1_781_192_854,
  type: ActivityType.TRADE,
  size: 434.763705,
  usdcSize: 10.292645,
  transactionHash:
    '0x0c57a0a4172abfdd1e4f7d9f2ba794d3a53ddba49e3715c8aee029f22cdbe941',
  price: 0.0229999995054785,
  side: 'BUY',
  outcomeIndex: 0,
  title: 'Will Netherlands win?',
  icon: '',
  name: 'Car',
  pseudonym: 'Peppery-Capital',
  bio: 'PredictFolio-4536',
  profileImage: '',
  profileImageOptimized: '',
};

describe('ActivitySchema', () => {
  it('normalizes binary market trade activity as a CLOB trade', () => {
    const activity = ActivitySchema.parse({
      ...BASE_ACTIVITY,
      conditionId:
        '0xd90bf5f45f24c5de7881707cb5374f3d991388a2d220fa7e0fe2be912cd7642a',
      asset:
        '110136933550893624733134445460153301975615510734202337526927943993346922198810',
      outcome: 'Knicks',
      slug: 'nba-nyk-sas-2026-06-13',
      eventSlug: 'nba-nyk-sas-2026-06-13',
    });

    expect(activity).toEqual(
      expect.objectContaining({
        type: ActivityType.TRADE,
        isCombo: false,
        tokenId:
          '110136933550893624733134445460153301975615510734202337526927943993346922198810',
        outcome: 'Knicks',
        slug: 'nba-nyk-sas-2026-06-13',
        eventSlug: 'nba-nyk-sas-2026-06-13',
      }),
    );
  });

  it('normalizes Combo trade activity without binary market metadata', () => {
    const activity = ActivitySchema.parse({
      ...BASE_ACTIVITY,
      conditionId:
        '0x0365b0e193b3bcd6f3f740f5b4e9ad85b40000000000000000000000000000',
      asset:
        '1536610888192297888380575190299871560736525977576785935254302389727433588736',
      outcome: '',
      slug: '',
      eventSlug: '',
      isCombo: true,
    });

    expect(activity).toEqual(
      expect.objectContaining({
        type: ActivityType.TRADE,
        isCombo: true,
        conditionId:
          '0x0365b0e193b3bcd6f3f740f5b4e9ad85b40000000000000000000000000000',
        positionId:
          '1536610888192297888380575190299871560736525977576785935254302389727433588736',
      }),
    );
    expect(activity).not.toHaveProperty('outcome');
    expect(activity).not.toHaveProperty('slug');
    expect(activity).not.toHaveProperty('eventSlug');
  });
});
