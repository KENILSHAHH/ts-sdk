import { type WalletType, WalletTypeSchema } from '@polymarket/bindings/gamma';
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

const FetchWalletTypeRequestSchema = z.object({
  address: z.string(),
  signer: z.string(),
});

export type FetchWalletTypeRequest = z.input<
  typeof FetchWalletTypeRequestSchema
>;

export type FetchWalletTypeError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the wallet type for an address and signer pair.
 *
 * @remarks
 * This is a low-level action that most SDK consumers will not need.
 *
 * @example
 * ```ts
 * const walletType = await fetchWalletType(client, {
 *   address: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   signer: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * console.log(walletType); // WalletType.EOA
 * ```
 *
 * @throws {@link FetchWalletTypeError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 */
export async function fetchWalletType(
  client: Client,
  request: FetchWalletTypeRequest,
): Promise<WalletType> {
  const params = parseUserInput(request, FetchWalletTypeRequestSchema);

  return unwrap(
    client.gamma
      .get('/wallet-type', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(WalletTypeSchema))
      .map(({ type }) => type),
  );
}
