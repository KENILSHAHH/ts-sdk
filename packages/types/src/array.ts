/**
 * A tuple type representing a non-empty array.
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];
