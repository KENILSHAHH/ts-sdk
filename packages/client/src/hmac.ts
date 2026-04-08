/** @internal */
export async function buildPolyHmacSignature(
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
