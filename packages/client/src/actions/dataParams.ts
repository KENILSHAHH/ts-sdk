import {
  type SearchParamPrimitive,
  type SearchParamsInput,
  toSearchParamValue,
} from './params';

/**
 * Data endpoints use camelCase query keys and comma-separated arrays.
 */
export function toDataSearchParams<TParams extends SearchParamsInput>(
  params: TParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      searchParams.append(key, value.map(toSearchParamValue).join(','));
      continue;
    }

    searchParams.append(key, toSearchParamValue(value as SearchParamPrimitive));
  }

  return searchParams;
}
