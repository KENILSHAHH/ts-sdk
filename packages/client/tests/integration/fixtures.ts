import { createSecureClient, type SecureClient } from '@polymarket/client';
import { signerFrom } from '@polymarket/client/viem';
import type { EvmAddress, PrivateKey } from '@polymarket/types';
import { expectEvmAddress, isPrivateKey } from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { it as base, type TestContext } from 'vitest';

type Skip = TestContext['skip'];

if (process.env.CI !== 'true') {
  try {
    process.loadEnvFile();
  } catch {
    // Integration fixtures intentionally skip when required env is absent.
  }
}

type IntegrationFixtures = {
  depositWallet: EvmAddress;
  secureClientWithDepositWallet: SecureClient;
};

export const it = base.extend<IntegrationFixtures>({
  depositWallet: async ({ skip }, use) => {
    await use(loadWalletAddress('POLYMARKET_DEPOSIT_WALLET', skip));
  },

  secureClientWithDepositWallet: async ({ depositWallet, skip }, use) => {
    const privateKey = loadPrivateKey('POLYMARKET_PRIVATE_KEY', skip);
    const walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: polygon,
      transport: http(),
    });
    const secureClient = await createSecureClient({
      signer: signerFrom(walletClient),
      wallet: depositWallet,
    });

    await use(secureClient);
  },
});

export { describe, expect } from 'vitest';

function loadWalletAddress(name: string, skip: Skip): EvmAddress {
  const value = process.env[name];

  if (value === undefined) {
    skip(`${name} is not set`);
  }

  return expectEvmAddress(value);
}

function loadPrivateKey(name: string, skip: Skip): PrivateKey {
  const value = process.env[name];

  if (value === undefined) {
    skip(`${name} is not set`);
  }

  if (!isPrivateKey(value)) {
    skip(`${name} must be a valid private key`);
  }

  return value;
}
