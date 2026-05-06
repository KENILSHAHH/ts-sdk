import type {
  AcceptedOrderResponse,
  OrderResponse,
} from '@polymarket/bindings/clob';
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
