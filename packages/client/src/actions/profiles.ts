import {
  type PublicProfile,
  PublicProfileSchema,
} from '@polymarket/bindings/gamma';
import { err, ok, unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { BaseClient } from '../clients';
import {
  type RateLimitError,
  RequestRejectedError,
  type TransportError,
  type UnexpectedResponseError,
  type UserInputError,
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
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const profile = await fetchPublicProfile(client, {
 *   address: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * // profile === PublicProfile | null
 * ```
 */
export async function fetchPublicProfile(
  client: BaseClient,
  request: FetchPublicProfileRequest,
): Promise<PublicProfile | null> {
  const params = parseUserInput(request, FetchPublicProfileRequestSchema);

  return unwrap(
    client.gamma
      .get('/public-profile', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(PublicProfileSchema))
      .orElse((error) => {
        if (error instanceof RequestRejectedError && error.status === 404) {
          return ok(null);
        }

        return err(error);
      }),
  );
}
