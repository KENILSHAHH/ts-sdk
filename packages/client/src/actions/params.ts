export type SearchParamPrimitive = boolean | number | string;

export function toSearchParamValue(value: SearchParamPrimitive): string {
  return String(value);
}
