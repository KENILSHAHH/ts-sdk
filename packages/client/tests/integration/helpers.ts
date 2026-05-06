import type {
  AcceptedOrderResponse,
  OrderResponse,
} from '@polymarket/bindings/clob';
import type { Page } from '@polymarket/client';
import { expectNonEmptyArray, type NonEmptyArray } from '@polymarket/types';
import { expect } from 'vitest';

export function expectAcceptedOrderResponse(
  response: OrderResponse,
): AcceptedOrderResponse {
  expect(response.ok).toBe(true);

  if (!response.ok) {
    throw new Error(
      `Expected accepted order response, received: ${response.code}`,
    );
  }

  return response;
}

export function expectNonEmptyPage<T>(
  page: Page<T[]>,
): Omit<Page<T[]>, 'items'> & { items: NonEmptyArray<T> } {
  return {
    ...page,
    items: expectNonEmptyArray(page.items),
  };
}
