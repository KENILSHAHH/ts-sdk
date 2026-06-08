import {
  type ComboConditionId,
  toComboConditionId,
} from '@polymarket/bindings';
import { expectEvmAddress } from '@polymarket/types';
import { describe, expect, it } from 'vitest';
import { mergeV2Call, redeemV2Call, splitV2Call } from './abis';

const ROUTER_ADDRESS = expectEvmAddress(
  '0x12121212006e4CD160D18e3f00711DA5c3372600',
);
const CONDITION_ID = toComboConditionId(
  '0x032def24bfb0c5c57fb236fac08b94236a0000000000000000000000000000',
);
// Simulates untyped JS callers that bypass the branded parser.
const YES_POSITION_CONDITION_ID =
  `${CONDITION_ID}00` as unknown as ComboConditionId;
const NO_POSITION_CONDITION_ID =
  `${CONDITION_ID}01` as unknown as ComboConditionId;

describe('Protocol v2 ABI helpers', () => {
  it('normalizes bytes32 combo condition wire forms before encoding', () => {
    expect(splitV2Call(ROUTER_ADDRESS, YES_POSITION_CONDITION_ID, 1n)).toEqual(
      splitV2Call(ROUTER_ADDRESS, CONDITION_ID, 1n),
    );
    expect(splitV2Call(ROUTER_ADDRESS, NO_POSITION_CONDITION_ID, 1n)).toEqual(
      splitV2Call(ROUTER_ADDRESS, CONDITION_ID, 1n),
    );

    expect(mergeV2Call(ROUTER_ADDRESS, YES_POSITION_CONDITION_ID, 1n)).toEqual(
      mergeV2Call(ROUTER_ADDRESS, CONDITION_ID, 1n),
    );
    expect(mergeV2Call(ROUTER_ADDRESS, NO_POSITION_CONDITION_ID, 1n)).toEqual(
      mergeV2Call(ROUTER_ADDRESS, CONDITION_ID, 1n),
    );

    expect(
      redeemV2Call(ROUTER_ADDRESS, YES_POSITION_CONDITION_ID, 1, 1n),
    ).toEqual(redeemV2Call(ROUTER_ADDRESS, CONDITION_ID, 1, 1n));
    expect(
      redeemV2Call(ROUTER_ADDRESS, NO_POSITION_CONDITION_ID, 1, 1n),
    ).toEqual(redeemV2Call(ROUTER_ADDRESS, CONDITION_ID, 1, 1n));
  });
});
