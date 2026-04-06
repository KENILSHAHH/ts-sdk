import {
  type ApiKeyCreds,
  ApiKeyCredsSchema,
  type ApiKeysResponse,
  ApiKeysResponseSchema,
} from '@polymarket/bindings/clob';
import { type EvmAddress, type Signature, unwrap } from '@polymarket/types';
import { createL2AuthTypedDataPayload } from '../authentication';
import type { Client, SecureClient } from '../clients';
import {
  type RateLimitError,
  RequestRejectedError,
  SigningError,
  type TransportError,
  type UnexpectedResponseError,
} from '../errors';
import { validateWith } from '../response';

export { createL2AuthTypedDataPayload };

export type CreateL2AuthRequest = {
  chainId: number;
  nonce?: number;
};

export type L2AuthRequest = {
  address: EvmAddress;
  nonce: number;
  signature: Signature;
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
  request: L2AuthRequest,
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
  request: L2AuthRequest,
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
 * Derives an API key and falls back to creation when one does not exist yet.
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
  request: L2AuthRequest,
): Promise<ApiKeyCreds> {
  try {
    return await deriveApiKey(client, request);
  } catch (error) {
    if (!(error instanceof RequestRejectedError) || error.status !== 400) {
      throw error;
    }
  }

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
export async function fetchApiKeys(
  client: SecureClient,
): Promise<ApiKeysResponse['apiKeys']> {
  const path = '/auth/api-keys';

  const response = await unwrap(
    client.clob
      .get(path.slice(1), {
        headers: await toL2Headers(client, {
          method: 'GET',
          requestPath: path,
        }),
      })
      .andThen(validateWith(ApiKeysResponseSchema)),
  );

  return response.apiKeys;
}

function toL1Headers(auth: L2AuthRequest): HeadersInit {
  return {
    POLY_ADDRESS: auth.address,
    POLY_NONCE: `${auth.nonce}`,
    POLY_SIGNATURE: auth.signature,
    POLY_TIMESTAMP: `${auth.timestamp}`,
  };
}

async function toL2Headers(
  client: SecureClient,
  request: { method: string; requestPath: string; body?: string },
): Promise<HeadersInit> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    return {
      POLY_ADDRESS: client.address,
      POLY_API_KEY: client.credentials.key,
      POLY_PASSPHRASE: client.credentials.passphrase,
      POLY_SIGNATURE: await buildPolyHmacSignature(
        client.credentials.secret,
        timestamp,
        request.method,
        request.requestPath,
        request.body,
      ),
      POLY_TIMESTAMP: `${timestamp}`,
    };
  } catch (error) {
    throw SigningError.fromError(
      error,
      'Could not sign the authenticated request',
    );
  }
}

async function buildPolyHmacSignature(
  secret: string,
  timestamp: number,
  method: string,
  requestPath: string,
  body?: string,
): Promise<string> {
  let message = `${timestamp}${method}${requestPath}`;

  if (body !== undefined) {
    message += body;
  }

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message),
  );

  return toUrlSafeBase64(arrayBufferToBase64(signature));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const sanitizedBase64 = base64
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/=]/g, '');
  const binaryString = atob(sanitizedBase64);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function toUrlSafeBase64(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_');
}
