# Agent Instructions

## TypeScript Config

- Root `tsconfig.json` and packages-level `tsconfig.json` files are for editor tooling and source navigation.
- `tsconfig.build.json` files are the configs used by package build and typecheck commands.
- When changing build behavior, prefer updating `tsconfig.build.json`.

## Docs

- In TSDoc `@example` blocks, do not include import statements. Keep examples focused on usage only.
