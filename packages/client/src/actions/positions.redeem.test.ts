import { ConditionIdSchema } from '@polymarket/bindings';
import type { Position } from '@polymarket/bindings/data';
import { WalletType } from '@polymarket/bindings/gamma';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseSecureClient } from '../clients';
import { UserInputError } from '../errors';

const listPositions = vi.hoisted(() => vi.fn());

vi.mock('./portfolio', () => ({
  listPositions,
}));

import { prepareRedeemPositions } from './positions';

const conditionId =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const marketId = '12345';
const wallet = '0x0000000000000000000000000000000000000001';

const client = {
  account: {
    wallet,
    walletType: WalletType.EOA,
  },
  environment: {
    chainId: 137,
    collateralToken: '0x0000000000000000000000000000000000000002',
    conditionalTokens: '0x0000000000000000000000000000000000000003',
    negRiskAdapter: '0x0000000000000000000000000000000000000004',
  },
} as unknown as BaseSecureClient;

const redeemablePosition = {
  conditionId: ConditionIdSchema.parse(conditionId),
  negativeRisk: false,
  oppositeTokenId: undefined,
  outcomeIndex: 0,
  size: 1,
  tokenId: undefined,
} satisfies Position;

describe('prepareRedeemPositions', () => {
  beforeEach(() => {
    listPositions.mockReset();
    listPositions.mockReturnValue({
      firstPage: async () => ({
        hasMore: false,
        items: [redeemablePosition],
      }),
    });
  });

  it('redeems by conditionId', async () => {
    await prepareRedeemPositions(client, { conditionId });

    expect(listPositions).toHaveBeenCalledWith(client, {
      market: [conditionId],
      sizeThreshold: 0,
      user: wallet,
    });
  });

  it('redeems by marketId', async () => {
    await prepareRedeemPositions(client, { marketId });

    expect(listPositions).toHaveBeenCalledWith(client, {
      market: [marketId],
      sizeThreshold: 0,
      user: wallet,
    });
  });

  it('requires exactly one redemption identifier', async () => {
    await expect(prepareRedeemPositions(client, {} as never)).rejects.toThrow(
      UserInputError,
    );
    await expect(
      prepareRedeemPositions(client, { conditionId, marketId } as never),
    ).rejects.toThrow(UserInputError);
  });
});
