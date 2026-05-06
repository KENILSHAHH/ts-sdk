import { type BuilderCode, BuilderCodeSchema } from '@polymarket/bindings';
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
import {
  deriveDepositWalletAddress,
  deriveProxyWalletAddress,
} from './account';
import { relayerApiKey } from './authorization';
import {
  createPublicClient,
  createSecureClient,
  type SecureClientOptions,
} from './clients';
// biome-ignore lint/style/noRestrictedImports: intentional
import { builderApiKey } from './node';
import type { Page } from './pagination';
import { signerFrom } from './viem';

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

export const builderAuthorization = builderApiKey(builderCredentials);

export const publicClientWithBuilderKey = createPublicClient({
  apiKey: builderAuthorization,
});

export const relayerAuthorization = relayerApiKey({
  key: expectPresent(process.env.POLYMARKET_RELAYER_API_KEY),
  address: expectPresent(process.env.POLYMARKET_RELAYER_API_KEY_ADDRESS),
});

export const publicClientWithRelayerKey = createPublicClient({
  apiKey: relayerAuthorization,
});

function loadPrivateKey(name: string): PrivateKey {
  const value = process.env[name];

  invariant(value, `${name} is not set`);

  invariant(isPrivateKey(value), `${name} must be a valid private key`);

  return value;
}

function loadWalletAddress(name: string): EvmAddress {
  const value = process.env[name];

  invariant(value, `${name} is not set`);

  return expectEvmAddress(value);
}

function createTestWalletClient(privateKey: PrivateKey) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: polygon,
    transport: http(),
  });
}

export const privateKey = loadPrivateKey('POLYMARKET_PRIVATE_KEY');
export const depositWallet = loadWalletAddress('POLYMARKET_DEPOSIT_WALLET');
export const safeWalletAddress = loadWalletAddress('POLYMARKET_SAFE_WALLET');

function loadBuilderCode(): BuilderCode {
  const value = process.env.POLYMARKET_BUILDER_CODE;

  invariant(value, 'POLYMARKET_BUILDER_CODE is not set');

  return BuilderCodeSchema.parse(value);
}

export const testBuilderCode = loadBuilderCode();

export function deriveProxyAddress(signerAddress: EvmAddress): EvmAddress {
  return deriveProxyWalletAddress(
    signerAddress,
    publicClient.environment.walletDerivation,
  );
}

export function deriveDepositWallet(signerAddress: EvmAddress): EvmAddress {
  return deriveDepositWalletAddress(
    signerAddress,
    publicClient.environment.walletDerivation,
  );
}

export const safeWalletClient = createTestWalletClient(
  loadPrivateKey('POLYMARKET_SAFE_PRIVATE_KEY'),
);

export function createSecureClientWithSafeWallet(
  options: Partial<SecureClientOptions> = {},
) {
  return createSecureClient({
    signer: signerFrom(safeWalletClient),
    wallet: safeWalletAddress,
    ...options,
  });
}

export function createSecureClientWithDepositWallet(
  options: Partial<SecureClientOptions> = {},
) {
  const walletClient = createTestWalletClient(privateKey);

  return createSecureClient({
    signer: signerFrom(walletClient),
    wallet: loadWalletAddress('POLYMARKET_DEPOSIT_WALLET'),
    ...options,
  });
}

export function createSecureClientWithProxyWallet(
  options: Partial<SecureClientOptions> = {},
) {
  const walletClient = createTestWalletClient(
    loadPrivateKey('POLYMARKET_PROXY_PRIVATE_KEY'),
  );

  return createSecureClient({
    signer: signerFrom(walletClient),
    wallet: loadWalletAddress('POLYMARKET_PROXY_WALLET'),
    ...options,
  });
}

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
      if (!(await isEligibleTradeCandidate(candidate))) {
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
    candidate.state.enableOrderBook === true &&
    candidate.state.acceptingOrders !== false &&
    candidate.trading.minimumOrderSize !== null &&
    candidate.trading.minimumOrderSize !== undefined &&
    candidate.outcomes.yes.tokenId !== null
  );
}

async function isEligibleTradeCandidate(candidate: Market) {
  if (
    !hasRequiredOrderFields(candidate) ||
    !hasTradableBestAsk(candidate) ||
    !hasTradableBestBid(candidate) ||
    !hasClobLiquidity(candidate)
  ) {
    return false;
  }

  return hasLiveOrderBook(candidate);
}

function hasTradableBestAsk(candidate: Market) {
  return (
    candidate.prices.bestAsk !== null &&
    candidate.prices.bestAsk !== undefined &&
    Number(candidate.prices.bestAsk) < 1
  );
}

function hasTradableBestBid(candidate: Market) {
  return (
    candidate.prices.bestBid !== null &&
    candidate.prices.bestBid !== undefined &&
    Number(candidate.prices.bestBid) > 0
  );
}

function hasClobLiquidity(candidate: Market) {
  return (
    Number(
      candidate.metrics.liquidityClob ?? candidate.metrics.liquidityNum ?? 0,
    ) > 0
  );
}

async function hasLiveOrderBook(candidate: Market) {
  const tokenId = candidate.outcomes.yes.tokenId;

  if (tokenId === null) {
    return false;
  }

  try {
    const book = await publicClient.fetchOrderBook({ tokenId });

    return book.asks.length > 0 && book.bids.length > 0;
  } catch {
    return false;
  }
}

export function expectNonEmptyPage<T>(
  page: Page<T[]>,
): Omit<Page<T[]>, 'items'> & { items: NonEmptyArray<T> } {
  return {
    ...page,
    items: expectNonEmptyArray(page.items),
  };
}
