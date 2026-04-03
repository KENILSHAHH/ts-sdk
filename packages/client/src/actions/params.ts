export type SearchParamPrimitive = boolean | number | string;

export type SearchParamValue =
  | SearchParamPrimitive
  | readonly SearchParamPrimitive[];

export type SearchParamsInput = Record<string, SearchParamValue | undefined>;

export type SearchParamMappings<TParams extends SearchParamsInput> = {
  [TKey in keyof TParams]: string;
};

export function toSearchParams<TParams extends SearchParamsInput>(
  params: TParams,
  mappings: SearchParamMappings<TParams>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [paramKey, searchParamKey] of Object.entries(mappings) as Array<
    readonly [keyof TParams, string]
  >) {
    const value = params[paramKey];

    if (value === undefined) {
      continue;
    }

    if (isSearchParamArray(value)) {
      for (const item of value) {
        searchParams.append(searchParamKey, toSearchParamValue(item));
      }

      continue;
    }

    searchParams.append(searchParamKey, toSearchParamValue(value));
  }

  return searchParams;
}

function isSearchParamArray(
  value: SearchParamValue,
): value is readonly SearchParamPrimitive[] {
  return Array.isArray(value);
}

export function toSearchParamValue(value: SearchParamPrimitive): string {
  return String(value);
}
