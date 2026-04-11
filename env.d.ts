declare namespace NodeJS {
  interface ProcessEnv {
    CI: string | undefined;
    POLYMARKET_TEST_PRIVATE_KEY: string | undefined;
    POLYMARKET_BUILDER_API_KEY: string | undefined;
    POLYMARKET_BUILDER_SECRET: string | undefined;
    POLYMARKET_BUILDER_PASSPHRASE: string | undefined;
  }
}
