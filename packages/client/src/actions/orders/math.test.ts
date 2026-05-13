import { describe, expect, it } from 'vitest';
import { decimalPlaces } from './math';

describe('decimalPlaces', () => {
  it.each([
    [1, 0],
    [1.2, 1],
    [1.23, 2],
    ['1.23', 2],
    [0.000001, 6],
    ['0.000001', 6],
  ])('counts ordinary decimal places for %s', (value, expected) => {
    expect(decimalPlaces(value)).toBe(expected);
  });

  it.each([
    [1e-7, 7],
    ['1e-7', 7],
    [1.23e-7, 9],
    ['1.23E-7', 9],
    [1.234e-7, 10],
  ])(
    'counts negative scientific notation decimal places for %s',
    (value, expected) => {
      expect(decimalPlaces(value)).toBe(expected);
    },
  );

  it.each([
    [1e3, 0],
    ['1e+3', 0],
    [1.23e3, 0],
    [1.23e1, 1],
    ['1.23e+1', 1],
    [1.234e2, 1],
  ])(
    'counts positive scientific notation decimal places for %s',
    (value, expected) => {
      expect(decimalPlaces(value)).toBe(expected);
    },
  );
});
