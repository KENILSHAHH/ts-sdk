declare namespace NodeJS {
  interface ProcessEnv {
    CI: string | undefined;
    POLYMARKET_TEST_PRIVATE_KEY: string | undefined;
  }
}
