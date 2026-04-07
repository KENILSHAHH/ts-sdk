const COLLATERAL_TOKEN_DECIMALS = 6;

export function parseAmount(value: number): bigint {
  return BigInt(Math.round(value * 10 ** COLLATERAL_TOKEN_DECIMALS));
}

export function roundDown(value: number, decimals: number): number {
  if (decimalPlaces(value) <= decimals) {
    return value;
  }

  return Math.floor(value * 10 ** decimals) / 10 ** decimals;
}

export function roundUp(value: number, decimals: number): number {
  if (decimalPlaces(value) <= decimals) {
    return value;
  }

  return Math.ceil(value * 10 ** decimals) / 10 ** decimals;
}

export function decimalPlaces(value: number): number {
  if (Number.isInteger(value)) {
    return 0;
  }

  const parts = value.toString().split('.');

  return parts.length <= 1 ? 0 : (parts[1]?.length ?? 0);
}
