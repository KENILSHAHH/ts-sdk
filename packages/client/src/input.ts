import type { z } from 'zod';
import { UserInputError } from './errors';

/**
 * Parses consumer input and throws `UserInputError` when validation fails.
 */
export function parseUserInput<TOutput>(
  input: unknown,
  schema: z.ZodType<TOutput>,
): TOutput {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw UserInputError.fromZodError(result.error);
}
