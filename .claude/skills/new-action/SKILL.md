---
name: new-action
description: Add a new client action
---

# Create a New Action

Creates a new action in `packages/client/src/actions` for the unified client surface.

## Usage

```
/new-action <action>
```

## Inputs

- Use TodoWrite for the main steps
- If the action is not explicit, ask the user which action to add before proceeding

## Workflow

- Create or update `packages/client/src/actions/<module>.ts`
- Prefer colocating related actions in the same module, such as market read actions in `markets.ts` and event read actions in `events.ts`
- Create a new module only when the action does not have a natural existing home
- If the module grouping or singular/plural module name is unclear, ask the user
- Re-export the action from `packages/client/src/actions/index.ts`
- Do not re-export actions from `packages/client/src/index.ts`; actions are consumed from `@polymarket/client/actions`
- Add or update an integration-style test in `packages/client/src/actions/<module>.test.ts`
- Reuse `packages/client/src/testing.ts` for the shared test client when tests need a client instance
- If the action needs bindings that do not exist yet, use `/new-resource` first to add the missing schemas and types in `packages/bindings`

## Action Rules

- Keep the public action API Polymarket-shaped and do not leak `ky` types, instances, hooks, or option shapes
- Accept `PolymarketClient` as the first parameter
- Prefer verb-led names for action functions; use `list<Resource>` for collection reads unless the user asks otherwise
- Avoid composing response schemas inside action code; parse responses with schemas exported from `@polymarket/bindings`
- Use the exported resource schema directly for 1:1 responses, and add a dedicated `...ResponseSchema` in `@polymarket/bindings` only when the transport shape differs from the resource shape, such as wrappers, pagination envelopes, or extra metadata
- Do not hand-roll missing response models in the client package; add them to `@polymarket/bindings` first
- Reuse types re-exported by `@polymarket/client` instead of creating redundant local type aliases for bindings types
- If request input benefits from runtime validation or normalization, use Zod in the action module
- Prefer inline Zod transforms with well-named helpers such as `.transform(toISODateString)`
- Keep helpers small and local; avoid extra abstractions that do not materially improve reuse or safety
- Document every public action with `@throws` blocks for each distinct error type it can throw
- When documenting action errors, trace the full call path instead of only the top-level function body: inspect local `throw` statements, helpers invoked before the request, and anything unwrapped from `Result`/`ResultAsync`
- `parseUserInput(...)` throws `UserInputError`
- `unwrap(Result<T, E> | ResultAsync<T, E>)` throws `E`
- In current client actions, `unwrap(client.<service>.get(...))` throws `RateLimitError`, `ServerError`, or `InvalidResponseError`
- Use one `@throws` block per error type and explain the condition that causes it; do not collapse multiple error types into a single union-style `@throws` line
- If a helper catches and remaps errors, document the remapped public errors rather than the helper's internal implementation details

## Testing Rules

- Default to integration-style tests
- Do not mock API responses unless the user explicitly asks for it or mocking is necessary to isolate a boundary under test
- Prefer light assertions over brittle full payload snapshots when testing live responses

## Validation

- Run `pnpm --filter @polymarket/client build`
- Run `pnpm --filter @polymarket/client typecheck`
- Run `pnpm test:client`
- Run `pnpm lint:fix`
