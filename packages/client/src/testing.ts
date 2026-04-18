import type { Market } from '@polymarket/bindings/gamma';
import type { EvmAddress, NonEmptyArray, PrivateKey } from '@polymarket/types';
import {
  expectEvmAddress,
  expectNonEmptyArray,
  expectPresent,
  invariant,
  isPrivateKey,
} from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { listMarkets } from './actions/markets';
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
  const candidateMarkets = await listMarkets(publicClient, {
    closed: false,
    pageSize: 1000,
    order: 'volume24hr',
    ascending: false,
    sportsMarketTypes: ['moneyline', 'spreads', 'totals'],
  })
    .firstPage()
    .then((page) => page.items);
  const market = candidateMarkets
    .filter(hasRequiredOrderFields)
    .sort(
      (left, right) =>
        (left.orderMinSize ?? Number.POSITIVE_INFINITY) -
        (right.orderMinSize ?? Number.POSITIVE_INFINITY),
    )[0];

  invariant(
    market !== undefined,
    'Could not find an active high-volume market with a very low tradable price',
  );

  return market;
}

function hasRequiredOrderFields(candidate: Market) {
  return (
    candidate.acceptingOrders !== false &&
    candidate.clobTokenIds !== null &&
    candidate.clobTokenIds !== undefined
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
