import { describe, expect, it } from 'vitest';
import { EventSchema } from './event';

describe('EventSchema', () => {
  it('exposes parentEventId as a string event id', () => {
    const event = EventSchema.parse({
      id: '570555',
      parentEventId: 570146,
    });

    expect(event.parentEventId).toBe('570146');
  });

  it('keeps parentEventId nullish when absent', () => {
    expect(EventSchema.parse({ id: '570146' }).parentEventId).toBeUndefined();
    expect(
      EventSchema.parse({ id: '570146', parentEventId: null }).parentEventId,
    ).toBeNull();
  });
});
