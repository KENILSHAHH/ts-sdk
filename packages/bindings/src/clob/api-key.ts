import { z } from 'zod';

export const RawApiKeyCredsSchema = z.object({
  apiKey: z.string(),
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
  apiKeys: z.array(z.string()),
});

export type ApiKeysResponse = z.infer<typeof ApiKeysResponseSchema>;
