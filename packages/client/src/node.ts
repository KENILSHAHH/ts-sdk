import process from 'node:process';
import { invariant } from '@polymarket/types';
import {
  type PublicClientConfig as BasePublicClientConfig,
  createPublicClient as createBasePublicClient,
  type PublicClient,
} from './clients';

invariant(
  process.release.name === 'node',
  'The @polymarket/client/node entrypoint requires a Node.js runtime.',
);
invariant(
  typeof window === 'undefined' && typeof document === 'undefined',
  'The @polymarket/client/node entrypoint cannot be imported in a browser-like runtime.',
);

export type PublicClientConfig = BasePublicClientConfig & {
  // TODO add builder credentials here
};

export function createPublicClient(
  config: PublicClientConfig = {},
): PublicClient {
  return createBasePublicClient(config);
}
