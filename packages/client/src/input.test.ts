import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { UserInputError } from './errors';
import { parseUserInput } from './input';

describe('input', () => {
  describe('parseUserInput', () => {
    it('returns parsed input on success', () => {
      const schema = z.object({
        limit: z.number().int().positive(),
      });

      const result = parseUserInput({ limit: 10 }, schema);

      expect(result).toEqual({ limit: 10 });
    });

    it('throws UserInputError on invalid input', () => {
      const schema = z.object({
        limit: z.number().int().positive(),
      });

      expect(() => parseUserInput({ limit: 'ten' }, schema)).toThrowError(
        UserInputError,
      );

      expect(() =>
        parseUserInput({ limit: 'ten' }, schema),
      ).toThrowErrorMatchingInlineSnapshot(`
          [UserInputError: Fix the following issues:
          - limit: Invalid input: expected number, received string]
        `);
    });
  });
});
