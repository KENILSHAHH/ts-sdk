import { describe, expect, it } from 'vitest';
import { TradeSchema } from './activity';
import { ClosedPositionSchema, PositionSchema } from './portfolio';

const conditionId = `0x${'cc'.repeat(32)}`;

describe('TradeSchema', () => {
  it('normalizes empty icon to null', () => {
    const trade = TradeSchema.parse({ conditionId, icon: '' });

    expect(trade.icon).toBeNull();
  });

  it('keeps populated icon values', () => {
    const trade = TradeSchema.parse({
      conditionId,
      icon: 'https://example.test/icon.png',
    });

    expect(trade.icon).toBe('https://example.test/icon.png');
  });
});

describe('PositionSchema', () => {
  it('normalizes empty icon to null', () => {
    const position = PositionSchema.parse({ conditionId, icon: '' });

    expect(position.icon).toBeNull();
  });
});

describe('ClosedPositionSchema', () => {
  it('normalizes empty icon to null', () => {
    const position = ClosedPositionSchema.parse({ conditionId, icon: '' });

    expect(position.icon).toBeNull();
  });
});
