import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const clientSourceDir = dirname(fileURLToPath(import.meta.url));
const nodeEntryUrl = pathToFileURL(resolve(clientSourceDir, 'node.ts'));

describe('node entrypoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects browser-like runtimes during module evaluation', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});

    await expect(
      import(`${nodeEntryUrl.href}?browser=${Date.now()}`),
    ).rejects.toThrow(/browser-like runtime/i);
  });
});
