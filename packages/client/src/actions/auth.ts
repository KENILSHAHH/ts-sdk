import type { ApiKey } from '@polymarket/bindings';
import {
  type ApiKeyCreds,
  ApiKeyCredsSchema,
  ApiKeysResponseSchema,
  type BuilderApiKey,
  type BuilderApiKeyCreds,
  BuilderApiKeyCredsSchema,
  BuilderApiKeysResponseSchema,
} from '@polymarket/bindings/clob';
import { type EvmAddress, type EvmSignature, unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client, SecureClient } from '../clients';
import {
  type RateLimitError,
  RequestRejectedError,
  type SigningError,
  type TransportError,
  type UnexpectedResponseError,
} from '../errors';
import { validateWith } from '../response';

export type ApiKeyAuthRequest = {
  address: EvmAddress;
  nonce: number;
  signature: EvmSignature;
  timestamp: number;
};

export type CreateApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;

/**
 * Creates a new API key from a signed L1 auth payload.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const creds = await createApiKey(client, request);
 * ```
 *
 * @throws {@link CreateApiKeyError}
 * Thrown when the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function createApiKey(
  client: Client,
  request: ApiKeyAuthRequest,
): Promise<ApiKeyCreds> {
  return unwrap(
    client.clob
      .post('auth/api-key', {
        headers: toL1Headers(request),
      })
      .andThen(validateWith(ApiKeyCredsSchema)),
  );
}

export type DeriveApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;

/**
 * Derives an existing API key from a signed L1 auth payload.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const creds = await deriveApiKey(client, request);
 * ```
 *
 * @throws {@link DeriveApiKeyError}
 * Thrown when the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function deriveApiKey(
  client: Client,
  request: ApiKeyAuthRequest,
): Promise<ApiKeyCreds> {
  return unwrap(
    client.clob
      .get('auth/derive-api-key', {
        headers: toL1Headers(request),
      })
      .andThen(validateWith(ApiKeyCredsSchema)),
  );
}

export type CreateOrDeriveApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;

/**
 * Creates an API key and falls back to derivation when it already exists.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const creds = await createOrDeriveApiKey(client, request);
 * ```
 *
 * @throws {@link CreateOrDeriveApiKeyError}
 * Thrown when the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function createOrDeriveApiKey(
  client: Client,
  request: ApiKeyAuthRequest,
): Promise<ApiKeyCreds> {
  try {
    return await createApiKey(client, request);
  } catch (error) {
    if (!(error instanceof RequestRejectedError) || error.status !== 400) {
      throw error;
    }
  }

  return deriveApiKey(client, request);
}

export type FetchApiKeysError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Fetches all API keys associated with the authenticated client.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const apiKeys = await fetchApiKeys(client);
 * ```
 *
 * @throws {@link FetchApiKeysError}
 * Thrown when request signing fails, or the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function fetchApiKeys(client: SecureClient): Promise<ApiKey[]> {
  const response = await unwrap(
    client.secureClob
      .get('/auth/api-keys')
      .andThen(validateWith(ApiKeysResponseSchema)),
  );

  return response.apiKeys;
}

export type DeleteApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Deletes the authenticated API key.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * await deleteApiKey(client);
 * ```
 *
 * @throws {@link DeleteApiKeyError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function deleteApiKey(client: SecureClient): Promise<void> {
  await unwrap(
    client.secureClob
      .del('/auth/api-key')
      .andThen(validateWith(z.literal('OK'))),
  );
}

export type CreateBuilderApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Creates a new builder API key for the authenticated client.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const builderApiKey = await createBuilderApiKey(client);
 * ```
 *
 * @throws {@link CreateBuilderApiKeyError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function createBuilderApiKey(
  client: SecureClient,
): Promise<BuilderApiKeyCreds> {
  return unwrap(
    client.secureClob
      .post('/auth/builder-api-key')
      .andThen(validateWith(BuilderApiKeyCredsSchema)),
  );
}

export type FetchBuilderApiKeysError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Fetches builder API keys associated with the authenticated client.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const builderApiKeys = await fetchBuilderApiKeys(client);
 * ```
 *
 * @throws {@link FetchBuilderApiKeysError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function fetchBuilderApiKeys(
  client: SecureClient,
): Promise<BuilderApiKey[]> {
  return unwrap(
    client.secureClob
      .get('/auth/builder-api-key')
      .andThen(validateWith(BuilderApiKeysResponseSchema)),
  );
}

export type RevokeBuilderApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;

/**
 * Revokes a builder API key.
 *
 * @remarks
 * This is a low-level auth action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * await revokeBuilderApiKey(client);
 * ```
 *
 * @throws {@link RevokeBuilderApiKeyError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function revokeBuilderApiKey(client: Client): Promise<void> {
  await unwrap(
    client.clob
      .del('/auth/builder-api-key')
      .andThen(validateWith(z.literal('OK'))),
  );
}

function toL1Headers(auth: ApiKeyAuthRequest): HeadersInit {
  return {
    POLY_ADDRESS: auth.address,
    POLY_NONCE: `${auth.nonce}`,
    POLY_SIGNATURE: auth.signature,
    POLY_TIMESTAMP: `${auth.timestamp}`,
  };
}
