/**
 * Builds the canonical HMAC signature for authenticated requests.
 *
 * The signed payload is the raw string concatenation of `timestamp`, `method`,
 * `requestPath`, and, when present, the serialized request `body`, matching the
 * remote signing contract.
 *
 * The `secret` is expected to be base64-encoded and is decoded before signing.
 * The returned signature is base64url-encoded with padding preserved.
 *
 * @example
 * Server-side signing example for builder-authenticated requests:
 *
 * ```ts
 * async function handleSignRequest(request: Request): Promise<Response> {
 *   const { body, method, path } = await request.json();
 *
 *   const timestamp = Math.floor(Date.now() / 1000);
 *   const signature = await buildHmacSignature(
 *     process.env.POLY_BUILDER_SECRET!,
 *     timestamp,
 *     method,
 *     path,
 *     body,
 *   );
 *
 *   return Response.json({
 *     POLY_BUILDER_API_KEY: process.env.POLY_BUILDER_API_KEY!,
 *     POLY_BUILDER_PASSPHRASE: process.env.POLY_BUILDER_PASSPHRASE!,
 *     POLY_BUILDER_SIGNATURE: signature,
 *     POLY_BUILDER_TIMESTAMP: `${timestamp}`,
 *   });
 * }
 * ```
 */
export async function buildHmacSignature(
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
