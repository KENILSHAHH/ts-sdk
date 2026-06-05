import { type PositionId, toPositionId } from '@polymarket/bindings';
import { describe, expect, it } from 'vitest';
import {
  type CanonicalComboLegs,
  canonicalizeComboLegs,
  decodeComboPositionId,
  deriveComboConditionId,
} from './protocol';

const CONDITION_ID =
  '0x032def24bfb0c5c57fb236fac08b94236a0000000000000000000000000000';

describe('Protocol helpers', () => {
  describe('canonicalizeComboLegs', () => {
    it('sorts unordered legs', () => {
      const legs = canonicalizeComboLegs([
        legPosition(2, 1),
        legPosition(1, 0),
      ]);

      expect(legs.map((leg) => leg.toString())).toEqual([
        legPosition(1, 0),
        legPosition(2, 1),
      ]);
    });

    it('rejects combo legs with both outcomes from one condition', () => {
      expect(() =>
        canonicalizeComboLegs([legPosition(1, 0), legPosition(1, 1)]),
      ).toThrow(/both outcomes/);
    });
  });

  describe('deriveComboConditionId', () => {
    it('derives a combo condition ID from canonical legs', () => {
      const legs = [
        BigInt(legPosition(1, 0)),
        BigInt(legPosition(2, 1)),
      ] as unknown as CanonicalComboLegs;

      expect(deriveComboConditionId(legs)).toBe(CONDITION_ID);
    });
  });

  describe('decodeComboPositionId', () => {
    it('decodes a combo position ID into a condition ID and outcome index', () => {
      const positionId = comboPosition(CONDITION_ID, 1);

      expect(decodeComboPositionId(positionId)).toEqual({
        conditionId: CONDITION_ID,
        outcomeIndex: 1,
        positionId: BigInt(positionId),
      });
    });

    it('rejects non-combo position IDs', () => {
      expect(() => decodeComboPositionId(legPosition(1, 0))).toThrow(
        /combinatorial module/,
      );
    });

    it('rejects combo position IDs with non-binary outcomes', () => {
      expect(() =>
        decodeComboPositionId(comboPosition(CONDITION_ID, 2)),
      ).toThrow(/YES\/NO/);
    });
  });
});

function legPosition(marker: number, outcome: number): PositionId {
  const bytes = new Uint8Array(32);
  bytes[0] = 1;
  bytes[30] = marker;
  bytes[31] = outcome;

  return toPositionId(
    BigInt(
      `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
    ).toString(),
  );
}

function comboPosition(conditionId: string, outcome: number): PositionId {
  return toPositionId(BigInt(`${conditionId}${byteHex(outcome)}`).toString());
}

function byteHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}
