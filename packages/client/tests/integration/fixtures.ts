import { type BuilderCode, BuilderCodeSchema } from '@polymarket/bindings';
import {
  type ApiKeyAuthorization,
  createPublicClient,
  createSecureClient,
  type PublicClient,
  relayerApiKey,
  type SecureClient,
  type Signer,
} from '@polymarket/client';
import { builderApiKey } from '@polymarket/client/node';
import { signerFrom } from '@polymarket/client/viem';
import type { EvmAddress, PrivateKey } from '@polymarket/types';
import { expectEvmAddress, isPrivateKey } from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { it as base, type TestAPI, type TestContext } from 'vitest';

type Skip = TestContext['skip'];

if (process.env.CI !== 'true') {
  try {
    process.loadEnvFile();
  } catch {
    // Integration fixtures intentionally skip when required env is absent.
  }
}

type IntegrationFixtures = {
  builderAuthentication: ApiKeyAuthorization;
  builderCode: BuilderCode;
  depositWalletAddress: EvmAddress;
  depositWalletSigner: Signer;
  publicClient: PublicClient;
  proxyWalletAddress: EvmAddress;
  proxyWalletSigner: Signer;
  randomEoaSigner: Signer;
  relayerAuthentication: ApiKeyAuthorization;
  safeWalletAddress: EvmAddress;
  safeWalletSigner: Signer;
  secureClientWithDepositWallet: SecureClient;
};

export const it: TestAPI<IntegrationFixtures> =
  base.extend<IntegrationFixtures>({
    publicClient: async ({ skip: _skip }, use) => {
      await use(createPublicClient());
    },

    depositWalletAddress: async ({ skip }, use) => {
      await use(loadWalletAddress('POLYMARKET_DEPOSIT_WALLET', skip));
    },

    safeWalletAddress: async ({ skip }, use) => {
      await use(loadWalletAddress('POLYMARKET_SAFE_WALLET', skip));
    },

    proxyWalletAddress: async ({ skip }, use) => {
      await use(loadWalletAddress('POLYMARKET_PROXY_WALLET', skip));
    },

    secureClientWithDepositWallet: async (
      { depositWalletAddress, depositWalletSigner },
      use,
    ) => {
      const secureClient = await createSecureClient({
        signer: depositWalletSigner,
        wallet: depositWalletAddress,
      });

      await use(secureClient);
    },

    depositWalletSigner: async ({ skip }, use) => {
      await use(
        createTestSigner(loadPrivateKey('POLYMARKET_PRIVATE_KEY', skip)),
      );
    },

    safeWalletSigner: async ({ skip }, use) => {
      await use(
        createTestSigner(loadPrivateKey('POLYMARKET_SAFE_PRIVATE_KEY', skip)),
      );
    },

    proxyWalletSigner: async ({ skip }, use) => {
      await use(
        createTestSigner(loadPrivateKey('POLYMARKET_PROXY_PRIVATE_KEY', skip)),
      );
    },

    relayerAuthentication: async ({ skip }, use) => {
      const authorization = relayerApiKey({
        key: loadRequiredEnv('POLYMARKET_RELAYER_API_KEY', skip),
        address: loadRequiredEnv('POLYMARKET_RELAYER_API_KEY_ADDRESS', skip),
      });

      await use(authorization);
    },

    builderAuthentication: async ({ skip }, use) => {
      const authentication = builderApiKey({
        key: loadRequiredEnv('POLYMARKET_BUILDER_API_KEY', skip),
        secret: loadRequiredEnv('POLYMARKET_BUILDER_SECRET', skip),
        passphrase: loadRequiredEnv('POLYMARKET_BUILDER_PASSPHRASE', skip),
      });

      await use(authentication);
    },

    builderCode: async ({ skip }, use) => {
      await use(
        BuilderCodeSchema.parse(
          loadRequiredEnv('POLYMARKET_BUILDER_CODE', skip),
        ),
      );
    },

    randomEoaSigner: async ({ skip: _skip }, use) => {
      await use(createTestSigner(generatePrivateKey()));
    },
  });

export const runMeteredTests = process.env.POLYMARKET_RUN_METERED_TESTS === '1';

export { describe, expect } from 'vitest';

function loadWalletAddress(name: string, skip: Skip): EvmAddress {
  const value = process.env[name];

  if (value === undefined) {
    skip(`${name} is not set`);
  }

  return expectEvmAddress(value);
}

function loadPrivateKey(name: string, skip: Skip): PrivateKey {
  const value = loadRequiredEnv(name, skip);

  if (!isPrivateKey(value)) {
    skip(`${name} must be a valid private key`);
  }

  return value;
}

function createTestWalletClient(privateKey: PrivateKey | `0x${string}`) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: polygon,
    transport: http(),
  });
}

function createTestSigner(privateKey: PrivateKey | `0x${string}`): Signer {
  return signerFrom(createTestWalletClient(privateKey));
}

function loadRequiredEnv(name: string, skip: Skip): string {
  const value = process.env[name];

  if (value === undefined) {
    skip(`${name} is not set`);
  }

  return value;
}
