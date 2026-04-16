import type { Market } from '@polymarket/bindings/gamma';
import type { EvmAddress, PrivateKey } from '@polymarket/types';
import {
  expectEvmAddress,
  expectPresent,
  invariant,
  isPrivateKey,
} from '@polymarket/types';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { listMarkets } from './actions/markets';
import { createPublicClient } from './clients';

// biome-ignore lint/style/noRestrictedImports: intentional
import { builderApiKey, relayerApiKey } from './node';

if (process.env.CI !== 'true') {
  try {
    process.loadEnvFile();
  } catch {
    console.warn('.env file is not present; using existing process.env values');
  }
}

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

function loadTestSafeWallet(): EvmAddress {
  const value = process.env.POLYMARKET_TEST_SAFE_WALLET;

  invariant(value, 'POLYMARKET_TEST_SAFE_WALLET is not set');

  return expectEvmAddress(value);
}

export const safeWalletAddress = loadTestSafeWallet();

export const walletClient = createWalletClient({
  account: privateKeyToAccount(loadTestPrivateKey()),
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
    limit: 1000,
    order: 'volume24hr',
    ascending: false,
  });
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

export function getPolymarketMarketUrl(market: Market): string {
  const eventSlug = getEventSlug(market);

  if (eventSlug !== undefined) {
    return `https://polymarket.com/event/${eventSlug}`;
  }

  invariant(
    market.slug !== null && market.slug !== undefined,
    'Could not derive a polymarket.com URL from the market payload',
  );

  return `https://polymarket.com/event/${market.slug}`;
}

function hasRequiredOrderFields(candidate: Market) {
  return (
    candidate.acceptingOrders !== false &&
    candidate.clobTokenIds !== null &&
    candidate.clobTokenIds !== undefined
  );
}

function getEventSlug(market: Market): string | undefined {
  const firstEvent = market.events?.[0] as { slug?: string | null } | undefined;

  return firstEvent?.slug ?? undefined;
}
