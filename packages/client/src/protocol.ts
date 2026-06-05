import type { ConditionId, PositionId } from '@polymarket/bindings';
import type { Tagged } from '@polymarket/types';
import { AbiParameters, Hash } from 'ox';
import { UserInputError } from './errors';

const UINT256_BYTE_LENGTH = 32;
const COMBINATORIAL_MODULE_ID = 3n;
const MAX_COMBO_LEGS = 50;
const UINT256_MAX = (1n << 256n) - 1n;

export type CanonicalComboLegs = Tagged<
  readonly bigint[],
  'CanonicalComboLegs'
>;

export type DecodedComboPositionId = {
  conditionId: ConditionId;
  outcomeIndex: 0 | 1;
  positionId: bigint;
};

/**
 * Derives a combo condition ID from canonical combo legs.
 */
export function deriveComboConditionId(legs: CanonicalComboLegs): ConditionId {
  const encodedLegs = AbiParameters.encode(
    [{ name: 'legs', type: 'uint256[]' }],
    [legs],
  );
  const baseHash = Hash.keccak256(
    AbiParameters.encode(
      [
        { name: 'moduleId', type: 'uint256' },
        { name: 'data', type: 'bytes' },
      ],
      [COMBINATORIAL_MODULE_ID, encodedLegs],
    ),
  );

  return `0x03${baseHash.slice(34)}0000000000000000000000000000` as ConditionId;
}

/**
 * Validates and canonicalizes combo leg position IDs.
 *
 * @throws {@link UserInputError}
 * Thrown when the legs do not form a valid combo condition.
 */
export function canonicalizeComboLegs(
  legs: readonly PositionId[],
): CanonicalComboLegs {
  if (legs.length === 0 || legs.length > MAX_COMBO_LEGS) {
    throw new UserInputError(
      `Combo legs must include 1 to ${MAX_COMBO_LEGS} position IDs`,
    );
  }

  const positions = legs.map((leg) => {
    const value = parsePositionId(leg);
    const hex = value.toString(16).padStart(UINT256_BYTE_LENGTH * 2, '0');
    const moduleId = Number.parseInt(hex.slice(0, 2), 16);
    const outcomeIndex = Number.parseInt(hex.slice(-2), 16);

    if ((moduleId !== 1 && moduleId !== 2) || outcomeIndex > 1) {
      throw new UserInputError(
        'Combo legs must be binary or neg-risk YES/NO position IDs',
      );
    }

    return {
      value,
      conditionId: hex.slice(0, -2),
    };
  });

  positions.sort((left, right) =>
    left.value < right.value ? -1 : left.value > right.value ? 1 : 0,
  );

  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    const current = positions[index];

    if (previous === undefined || current === undefined) {
      throw new UserInputError('Invalid combo leg set');
    }

    if (previous.value === current.value) {
      throw new UserInputError(
        'Combo legs must not contain duplicate position IDs',
      );
    }

    if (previous.conditionId === current.conditionId) {
      throw new UserInputError(
        'Combo legs must not contain both outcomes for the same condition',
      );
    }
  }

  return positions.map(
    (position) => position.value,
  ) as unknown as CanonicalComboLegs;
}

/**
 * Decodes a combo YES/NO position ID into its condition ID and outcome index.
 *
 * @throws {@link UserInputError}
 * Thrown when the position ID is not a valid combo YES/NO position ID.
 */
export function decodeComboPositionId(
  positionId: PositionId,
): DecodedComboPositionId {
  const value = parsePositionId(positionId);
  const hex = value.toString(16).padStart(UINT256_BYTE_LENGTH * 2, '0');
  const moduleId = BigInt(`0x${hex.slice(0, 2)}`);
  const outcomeIndex = Number.parseInt(hex.slice(-2), 16);

  if (moduleId !== COMBINATORIAL_MODULE_ID) {
    throw new UserInputError(
      'Combo position ID must use the combinatorial module',
    );
  }

  if (outcomeIndex !== 0 && outcomeIndex !== 1) {
    throw new UserInputError('Combo position ID must be a YES/NO position ID');
  }

  return {
    conditionId: `0x${hex.slice(0, -2)}` as ConditionId,
    outcomeIndex,
    positionId: value,
  };
}

function parsePositionId(positionId: PositionId): bigint {
  const value = positionId.trim();
  let parsed: bigint;

  if (value.length === 0) {
    throw new UserInputError('Position ID must be a uint256 value');
  }

  try {
    parsed = BigInt(value);
  } catch {
    throw new UserInputError('Position ID must be a uint256 value');
  }

  if (parsed < 0n || parsed > UINT256_MAX) {
    throw new UserInputError('Position ID must be a uint256 value');
  }

  return parsed;
}
