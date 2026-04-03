# AGENTS.md

## Scope

Instructions for the `polymarket-sdk` repository.

## Quick orientation

- Docs and design notes: `docs/`
- SDK packages: `packages/`
- Main client package: `packages/client`
- Shared types: `packages/types`
- Future bindings work: `packages/bindings`
- Runnable examples: `examples/react`

## Required workflow

## Guardrails

- This repo is the home for Polymarket's TypeScript SDKs.
- The first shipping target is `@polymarket/client`.
- `@polymarket/client` unifies Polymarket's 4 current API surfaces: CLOB, Gamma, data, and relayer.
- The SDK should present one cohesive consumer interface and hide service boundaries where possible.
- Public package design should follow developer workflows rather than today's internal API split.
- Future work includes `@polymarket/react`, which should build on the same core model with a higher-level frontend-oriented surface.
- Do not leak `ky` details outside of `@polymarket/client`. Keep `ky` instances, types, and option shapes internal to the client package, and expose Polymarket-specific abstractions instead.

## Code conventions

- Root `tsconfig.json` and packages-level `tsconfig.json` files are for editor tooling and source navigation.
- `tsconfig.build.json` files are the configs used by package build and typecheck commands.
- When changing build behavior, prefer updating `tsconfig.build.json`.
- Prefer `type` over `interface` unless an interface is clearly needed, such as when a class implements it or declaration extensibility is a deliberate requirement.
- Avoid small helper abstractions that do not meaningfully improve reuse or safety.
- In TSDoc `@example` blocks, do not include import statements. Keep examples focused on usage only.

## Response contract

## Directory-specific notes

- For fuller package direction and design context, see `docs/sdk-direction.md`.
