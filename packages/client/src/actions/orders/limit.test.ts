import { OrderSide } from '@polymarket/bindings';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrepareLimitOrderParamsSchema } from './limit';

describe('PrepareLimitOrderParamsSchema', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a GTD expiration exactly 60 seconds in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    expect(
      PrepareLimitOrderParamsSchema.safeParse({
        expiration: Math.floor(Date.now() / 1000) + 60,
        price: 0.52,
        side: OrderSide.BUY,
        size: 10,
        tokenId: '123',
      }).success,
    ).toBe(true);
  });

  it('rejects a GTD expiration less than 60 seconds in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    expect(
      PrepareLimitOrderParamsSchema.safeParse({
        expiration: Math.floor(Date.now() / 1000) + 59,
        price: 0.52,
        side: OrderSide.BUY,
        size: 10,
        tokenId: '123',
      }).success,
    ).toBe(false);
  });
});
