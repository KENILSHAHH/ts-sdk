import { z } from 'zod';

export const ApiKeyResponseSchema = z.object({
  apiKey: z.string(),
  secret: z.string(),
  passphrase: z.string(),
});

export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;

export const ApiKeysResponseSchema = z.object({
  apiKeys: z.array(z.string()),
});

export type ApiKeysResponse = z.infer<typeof ApiKeysResponseSchema>;
