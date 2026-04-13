import {
  type PublicProfile,
  PublicProfileSchema,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

const FetchPublicProfileRequestSchema = z.object({
  address: z.string(),
});

export type FetchPublicProfileRequest = z.input<
  typeof FetchPublicProfileRequestSchema
>;

export type FetchPublicProfileError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches a public profile by wallet address.
 *
 * @throws {@link FetchPublicProfileError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const profile = await fetchPublicProfile(client, {
 *   address: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * // profile === PublicProfile
 * ```
 */
export async function fetchPublicProfile(
  client: Client,
  request: FetchPublicProfileRequest,
): Promise<PublicProfile> {
  const params = parseUserInput(request, FetchPublicProfileRequestSchema);

  return unwrap(
    client.gamma
      .get('/public-profile', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(PublicProfileSchema)),
  );
}
