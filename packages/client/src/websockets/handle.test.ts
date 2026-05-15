import { pushable } from 'it-pushable';
import { describe, expect, it } from 'vitest';
import { createSubscriptionHandle } from './handle';

describe('createSubscriptionHandle', () => {
  it('ends iterator reads after close without draining buffered events', async () => {
    const queue = pushable<string>({ objectMode: true });
    const handle = createSubscriptionHandle(queue, async () => {
      queue.end();
    });

    queue.push('event');
    await handle.close();

    await expect(handle[Symbol.asyncIterator]().next()).resolves.toMatchObject({
      done: true,
    });
  });
});
