# SDK Direction

This repo is the home for Polymarket's TypeScript SDKs.

The first shipping target is `@polymarket/client`. Its job is to make Polymarket easier to integrate with today, without waiting for full platform consolidation across backend services.

## Current Goal

- Ship the first iteration of `@polymarket/client`.
- Build on top of Polymarket's 4 current API surfaces: CLOB, Gamma, data, and relayer.
- Give consumers one coherent TypeScript interface for common workflows.

## Design Direction

- The public SDK should hide today's service boundaries where possible.
- Package design should follow developer workflows rather than the current internal API split.
- The SDK should feel pragmatic and typed, staying close to real integration needs without forcing consumers to understand how current services are divided.
- The SDK can still expose lower-level controls when they are useful, but the default experience should feel unified.

## Current Decisions

- Omit readonly API key management from the first `@polymarket/client` surface for now.
- Keep phase 2 focused on standard authenticated account reads that are clearly part of the primary trading workflow.
- Revisit readonly API keys later if there is a concrete SDK use case and clearer public documentation.

## TODO

- In this case, make CLOB responses use camelCased fields.
- Add a cache layer for `tickSize`, fee bps, and `negRisk` metadata.
- Consider moving `SignedOrder` into `packages/client/src/types.ts` so it is easier to reuse across order actions and wallet helpers.
- Revisit whether the Gamma `GET /markets` `active` flag should be modeled in the SDK, since it is accepted in practice but omitted from the current OpenAPI contract and current client request type.

## Package Direction

- `@polymarket/client` is the main near-term package.
- It should provide a cohesive server-side and TypeScript-first integration surface.
- Future work includes `@polymarket/react`, which should build on the same core model but offer a higher-level frontend-oriented interface.

## Non-Goals

- Mirror today's service fragmentation directly in the public SDK surface.
- Make all future SDKs expose the exact same abstraction level.
- Wait for backend consolidation before improving developer experience.
