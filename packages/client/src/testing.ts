import type { PrivateKey } from '@polymarket/types';
import { invariant, isPrivateKey } from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { createPublicClient } from './clients';

if (process.env.CI !== 'true') {
  try {
    process.loadEnvFile();
  } catch {
    console.warn('.env file is not present; using existing process.env values');
  }
}

export const publicClient = createPublicClient();

function getTestPrivateKey(): PrivateKey {
  const value = process.env.POLYMARKET_TEST_PRIVATE_KEY;

  invariant(value, 'POLYMARKET_TEST_PRIVATE_KEY is not set');

  invariant(
    isPrivateKey(value),
    'POLYMARKET_TEST_PRIVATE_KEY must be a valid private key',
  );

  return value;
}

export function createTestWalletClient() {
  const privateKey = getTestPrivateKey();

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: polygon,
    transport: http(),
  });
}
