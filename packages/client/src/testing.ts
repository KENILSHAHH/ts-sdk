import { invariant, isPrivateKey } from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient } from './clients';

process.loadEnvFile?.();

export const publicClient = createPublicClient();

export function getTestPrivateKey(): `0x${string}` | undefined {
  const value = process.env.POLYMARKET_TEST_PRIVATE_KEY;

  if (!value || value === '0xYOUR_TEST_PRIVATE_KEY') {
    return undefined;
  }

  invariant(
    isPrivateKey(value),
    'POLYMARKET_TEST_PRIVATE_KEY must be a valid private key',
  );

  return value;
}

export function createTestWalletClient() {
  const privateKey = getTestPrivateKey();

  invariant(privateKey, 'POLYMARKET_TEST_PRIVATE_KEY is not set');

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    transport: http(),
  });
}
