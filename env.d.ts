declare namespace NodeJS {
  interface ProcessEnv {
    CI: string | undefined;
    POLYMARKET_RUN_BACKEND_COMPAT_TESTS: string | undefined;
    POLYMARKET_RUN_METERED_TESTS: string | undefined;
    POLYMARKET_TEST_PRIVATE_KEY: string | undefined;
    POLYMARKET_TEST_SAFE_WALLET: string | undefined;
    PRIVY_TEST_APP_ID: string | undefined;
    PRIVY_TEST_APP_SECRET: string | undefined;
    PRIVY_TEST_WALLET_ID: string | undefined;
    POLYMARKET_BUILDER_API_KEY: string | undefined;
    POLYMARKET_BUILDER_SECRET: string | undefined;
    POLYMARKET_BUILDER_PASSPHRASE: string | undefined;
    POLYMARKET_RELAYER_API_KEY: string | undefined;
    POLYMARKET_RELAYER_API_KEY_ADDRESS: string | undefined;
  }
}
