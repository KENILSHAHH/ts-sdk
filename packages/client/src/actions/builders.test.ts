import { describe, expect, it } from 'vitest';
// biome-ignore lint/style/noRestrictedImports: intentional
import { createPublicClient } from '../node';
import { builderCredentials } from '../testing';
import { listBuilderTrades } from './builders';

describe('Builders', () => {
  describe('listBuilderTrades', () => {
    it('lists builder trades', async () => {
      const client = createPublicClient({
        builder: builderCredentials,
      });

      const result = await listBuilderTrades(client);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
