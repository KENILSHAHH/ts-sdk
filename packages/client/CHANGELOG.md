# @polymarket/client

## 0.1.0-beta.4

### Patch Changes

- 02ad8fa: Add distinct CTF and combo condition ID brands, keeping the previous condition ID exports as deprecated CTF aliases.
- 9ac8027: Update the production RFQ quoter WebSocket URL.
- 9a1f0e5: Reject whitespace-only search queries and trim leading or trailing search input.
- Updated dependencies [02ad8fa]
- Updated dependencies [0809105]
  - @polymarket/bindings@0.1.0-beta.4

## 0.1.0-beta.3

### Patch Changes

- 369cd11: Default `createSecureClient` to the authenticated signer's current deterministic Deposit Wallet when no wallet is provided. The client now derives the current Deposit Wallet at runtime, deploys it when needed, and preserves explicit EOA and existing wallet behavior.
- 369cd11: Make `setupTradingApprovals` idempotent by checking existing ERC-20 allowances and ERC-1155 operator approvals before submitting transactions. The method now waits internally and returns a deprecated compatibility handle for callers that still call `wait()`.
- 77fdb6e: Document order book level ordering and custom market subscription events.
- d134853: Add support for redeeming full combo position balances by position ID.
- 6516128: Add support for splitting and merging combo positions by legs, including `amount: 'max'` for combo merge.
- b03e211: Map unknown builder fee responses to `UserInputError`.
- d00d70f: Accept copied `/event/{slug}` market URLs when fetching markets by URL.
- c188742: Default `listEvents` to open events when `closed` is omitted.
- 04bbc46: Align wallet action error unions with gasless transaction failure paths for non-EOA accounts.
- 55d0ecf: Allow GTD limit order expirations exactly 60 seconds in the future and document using an additional latency buffer.
- 6e0f923: Add repository metadata required for npm trusted publishing provenance validation.
- d1fcc5f: Harden RFQ quoter WebSocket handling for unknown and malformed inbound frames.
- 3bbdb26: Restore account trade listing to the legacy endpoint and parse legacy epoch-seconds timestamps correctly.
- e7a8858: Drop unsupported tag/series request params and response fields, and normalize related tag id fields to camelCase.
- 6516128: Add `listComboPositions` for fetching combo positions with typed response bindings and SDK-owned pagination.
- b0181de: Mark public action entry point helpers as low-level functions and point consumers to client instance APIs.
- 0dc6339: Declare Node.js 24 as the minimum supported runtime for published SDK packages.
- e1e5808: Add maker-side RFQ WebSocket support.
- aeec7ff: Clear cached RFQ quoter sessions immediately after unexpected websocket disconnects.
- 14d50f2: Update the RFQ quoter WebSocket URL.
- b57a13a: Define RFQ quoter WebSocket behavior for uncorrelated error frames.
- d045298: Allow activity market icons to be null when the Data API returns sparse historical rows without an icon URL.
- 2067f38: Allow `createSecureClient` authentication to accept an explicit `nonce: 0`, matching the documented default nonce behavior.
- Updated dependencies [77fdb6e]
- Updated dependencies [6e0f923]
- Updated dependencies [3bbdb26]
- Updated dependencies [e7a8858]
- Updated dependencies [6516128]
- Updated dependencies [0dc6339]
- Updated dependencies [e1e5808]
- Updated dependencies [d045298]
  - @polymarket/bindings@0.1.0-beta.3
  - @polymarket/types@0.1.0-beta.3

## 0.1.0-beta.2

### Patch Changes

- 3a8d59a: chore: configure packages for public beta release.
- Updated dependencies [3a8d59a]
  - @polymarket/bindings@0.1.0-beta.2
  - @polymarket/types@0.1.0-beta.2

## 0.1.0-beta.1

### Patch Changes

- d144ca9: chore: empty changeset to test new release workflow
- Updated dependencies [d144ca9]
  - @polymarket/bindings@0.1.0-beta.1
  - @polymarket/types@0.1.0-beta.1

## 0.1.0-beta.0

### Minor Changes

- 15597df: Bootstrap beta prerelease publishing.

### Patch Changes

- Updated dependencies [15597df]
  - @polymarket/bindings@0.1.0-beta.0
  - @polymarket/types@0.1.0-beta.0
