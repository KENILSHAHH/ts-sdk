# `@polymarket/client`

The `@polymarket/client` package is the core TypeScript client for the Polymarket SDK.

## Installation

```bash
pnpm add @polymarket/client
```

## Usage

```ts
import { createPublicClient } from '@polymarket/client';

const client = createPublicClient();

const result = client.listMarkets({
  closed: false,
  pageSize: 3,
});

for await (const page of result) {
  // page.items: Market[] 
}
```

## Development

From the monorepo root:

```bash
pnpm --filter @polymarket/client build
```

## License

MIT
