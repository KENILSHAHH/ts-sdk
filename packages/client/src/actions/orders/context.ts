import type { TickSizeValue } from '@polymarket/bindings';
import { invariant } from '@polymarket/types';

export type RoundingConfig = {
  amount: number;
  price: number;
  size: number;
};

export function resolveRoundingConfig(tickSize: TickSizeValue): RoundingConfig {
  switch (tickSize) {
    case 0.1:
      return { amount: 3, price: 1, size: 2 };
    case 0.01:
      return { amount: 4, price: 2, size: 2 };
    case 0.001:
      return { amount: 5, price: 3, size: 2 };
    case 0.0001:
      return { amount: 6, price: 4, size: 2 };
  }

  invariant(false, `Unsupported tick size: ${tickSize}`);
}
