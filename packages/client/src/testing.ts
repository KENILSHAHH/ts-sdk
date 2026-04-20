import type { Market } from '@polymarket/bindings/gamma';
import type { EvmAddress, NonEmptyArray, PrivateKey } from '@polymarket/types';
import {
  expectEvmAddress,
  expectNonEmptyArray,
  expectPresent,
  invariant,
  isPrivateKey,
  never,
} from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { relayerApiKey } from './authorization';
import { createPublicClient } from './clients';
// biome-ignore lint/style/noRestrictedImports: intentional
import { builderApiKey } from './node';
import type { Page } from './pagination';

if (process.env.CI !== 'true') {
  try {
    process.loadEnvFile();
  } catch {
    console.warn('.env file is not present; using existing process.env values');
  }
}

export const runMeteredTests = process.env.POLYMARKET_RUN_METERED_TESTS === '1';

export const publicClient = createPublicClient();

export const builderCredentials = {
  key: expectPresent(process.env.POLYMARKET_BUILDER_API_KEY),
  secret: expectPresent(process.env.POLYMARKET_BUILDER_SECRET),
  passphrase: expectPresent(process.env.POLYMARKET_BUILDER_PASSPHRASE),
} as const;

export const publicClientWithBuilderKey = createPublicClient({
  apiKey: builderApiKey(builderCredentials),
});

export const publicClientWithRelayerKey = createPublicClient({
  apiKey: relayerApiKey({
    key: expectPresent(process.env.POLYMARKET_RELAYER_API_KEY),
    address: expectPresent(process.env.POLYMARKET_RELAYER_API_KEY_ADDRESS),
  }),
});

function loadTestPrivateKey(): PrivateKey {
  const value = process.env.POLYMARKET_TEST_PRIVATE_KEY;

  invariant(value, 'POLYMARKET_TEST_PRIVATE_KEY is not set');

  invariant(
    isPrivateKey(value),
    'POLYMARKET_TEST_PRIVATE_KEY must be a valid private key',
  );

  return value;
}

export const testPrivateKey = loadTestPrivateKey();

function loadTestSafeWallet(): EvmAddress {
  const value = process.env.POLYMARKET_TEST_SAFE_WALLET;

  invariant(value, 'POLYMARKET_TEST_SAFE_WALLET is not set');

  return expectEvmAddress(value);
}

export const safeWalletAddress = loadTestSafeWallet();

export const walletClient = createWalletClient({
  account: privateKeyToAccount(testPrivateKey),
  chain: polygon,
  transport: http(),
});

export function createRandomWalletClient() {
  const privateKey = generatePrivateKey();

  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: polygon,
    transport: http(),
  });
}

export async function findHighVolumeLowPriceMarket(): Promise<Market> {
  const paginator = publicClient.listMarkets({
    closed: false,
    liquidityNumMin: 1000,
    pageSize: 1000,
    order: 'liquidityNum',
    ascending: false,
    sportsMarketTypes: ['moneyline', 'spreads', 'totals'],
  });

  for await (const page of paginator) {
    for (const candidate of page.items) {
      if (!isEligibleTradeCandidate(candidate)) {
        continue;
      }

      return candidate;
    }
  }

  never(
    'Could not find an active high-volume market with a very low tradable price',
  );
}

function hasRequiredOrderFields(candidate: Market) {
  return (
    candidate.acceptingOrders !== false &&
    candidate.orderMinSize !== null &&
    candidate.orderMinSize !== undefined &&
    candidate.clobTokenIds !== null &&
    candidate.clobTokenIds !== undefined
  );
}

function isEligibleTradeCandidate(candidate: Market) {
  return hasRequiredOrderFields(candidate) && hasTradableBestAsk(candidate);
}

function hasTradableBestAsk(candidate: Market) {
  return (
    candidate.bestAsk !== null &&
    candidate.bestAsk !== undefined &&
    candidate.bestAsk < 1
  );
}

export function expectNonEmptyPage<T>(
  page: Page<T>,
): Omit<Page<T>, 'items'> & { items: NonEmptyArray<T> } {
  return {
    ...page,
    items: expectNonEmptyArray(page.items),
  };
}
