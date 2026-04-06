import {
  type PublicProfile,
  PublicProfileSchema,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

const FetchPublicProfileRequestSchema = z.object({
  address: z.string(),
});

export type FetchPublicProfileRequest = z.input<
  typeof FetchPublicProfileRequestSchema
>;

/**
 * Fetches a public profile by wallet address.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
 * Thrown if the server returns an unexpected response.
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
      .get('public-profile', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(PublicProfileSchema)),
  );
}
