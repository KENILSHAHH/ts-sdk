# AGENTS.md

## Quick orientation

- Primary design doc: `docs/sdk-direction.md`
- SDK packages: `packages/`
- Main client package: `packages/client`
- Shared primitives: `packages/types`
- API bindings: `packages/bindings`
- Runnable examples: `examples/*`

## Required workflow

- Before finishing, run:
  - `pnpm lint`
  - `pnpm typecheck`
- If `pnpm lint` reports fixable issues, run `pnpm lint:fix`, review the resulting edits, and rerun `pnpm lint`.
- For cross-package changes, build changed dependencies before targeted verification because workspace packages are often consumed through built `dist` outputs.
- Example: if `packages/bindings` changes and you are validating `packages/client`, run `pnpm --filter @polymarket/bindings build` before `pnpm test:client`.
- If multiple packages changed or the dependency chain is unclear, prefer root-level verification such as `pnpm build` and `pnpm test`.

## Guardrails

- This repo is the home for Polymarket's TypeScript SDKs. The first shipping target is `@polymarket/client`.
- `@polymarket/client` unifies Polymarket's 4 current API surfaces: CLOB, Gamma, data, and relayer.
- The SDK should present one cohesive consumer interface, follow developer workflows, and hide service boundaries where possible.
- When you discover a real boundary inconsistency between underlying CLOB, Gamma, Data, and relayer APIs, append a concise note to `docs/api-boundary-notes.md`.
- Future work includes `@polymarket/react`, which should build on the same core model with a higher-level frontend-oriented surface.
- Do not leak `ky` details outside of `ServiceClient`. Keep `ky` instances, types, and option shapes internal, and expose Polymarket-specific abstractions instead.

## TypeScript config

- Root `tsconfig.json` and package-level `tsconfig.json` files are for editor tooling and source navigation only.
- `tsconfig.build.json` files drive build and typecheck behavior. When changing build behavior or fixing build issues, update `tsconfig.build.json`, not the root or package `tsconfig.json`.
- When adding a new entry point to a low-level package in the monorepo, add the corresponding alias to `compilerOptions.paths` in the root `tsconfig.json` so IDE resolution keeps working.

## Code conventions

- Prefer `type` over `interface` unless an interface is clearly needed, such as when a class implements it or declaration extensibility is a deliberate requirement.
- Prefer function declarations over arrow functions unless there is a clear reason to use an arrow function.
- Prefer simple, local code. Accept small duplication when it keeps logic easier to read.
- Introduce helpers only when they meaningfully improve reuse, safety, or readability. Helper names should reflect their real behavior; otherwise inline or rename them.
- Shape abstractions around real supported workflows and current platform behavior, not generic completeness. Add breadth only when a concrete use case requires it.
- In TSDoc `@example` blocks, do not include import statements. Keep examples focused on usage only.
- Public TSDoc must not mention underlying service boundaries such as Gamma, CLOB, Data API, or relayer. Public docs should describe the unified SDK surface, while tests may mention the underlying services when useful.

## Testing

- Default client tests to integration-style coverage.
- Do not mock API responses unless explicitly requested or unless mocking is necessary to isolate a boundary under test.

## Response contract

Be concise.
