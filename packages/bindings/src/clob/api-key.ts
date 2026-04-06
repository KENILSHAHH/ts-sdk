import { z } from 'zod';
import { ApiKeySchema } from '../shared';

export const RawApiKeyCredsSchema = z.object({
  apiKey: ApiKeySchema,
  secret: z.string(),
  passphrase: z.string(),
});

export const ApiKeyCredsSchema = RawApiKeyCredsSchema.transform((creds) => ({
  key: creds.apiKey,
  passphrase: creds.passphrase,
  secret: creds.secret,
}));

export type ApiKeyCreds = z.infer<typeof ApiKeyCredsSchema>;

export const ApiKeysResponseSchema = z.object({
  apiKeys: z.array(ApiKeySchema),
});

export type ApiKeysResponse = z.infer<typeof ApiKeysResponseSchema>;
