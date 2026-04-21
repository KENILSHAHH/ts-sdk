# Polymarket SDK

The Polymarket SDK is a pnpm monorepo for the core TypeScript client and runnable example applications.

## Monorepo Structure

This repository is organized as a pnpm workspace with packages for the SDK itself and apps for runnable examples.

| Package                                    | Description                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| [`packages/bindings`](./packages/bindings) | Placeholder package for future OpenAPI bindings       |
| [`packages/client`](./packages/client)     | Core TypeScript client package for the Polymarket SDK |
| [`packages/types`](./packages/types)       | Shared TypeScript types for the Polymarket SDK        |
| [`examples/react`](./examples/react)       | React + Ladle example app for exploring the SDK       |

## Requirements

- Node.js `>=24`
- pnpm `>=10`

## Quick Start

Install dependencies:

```bash
nvm use
corepack install
pnpm install
```

Set up local environment variables:

```bash
cp .env.example .env
```

Then open `.env` and fill in the fields.

Start the React examples:

```bash
pnpm dev
```

Build all workspace packages:

```bash
pnpm build
```

## Development Workflow

The root scripts are:

- `pnpm dev` - start the Ladle examples in `examples/react`
- `pnpm build` - build all workspace packages that expose a build script
- `pnpm clean` - remove package build output from `packages/*/dist`

## Publishing

The current pre-release approach is to publish canary builds for every commit on `main` that passes the `Verify` workflow.

Current workflow:

1. Push a commit to `main`.
2. The `Verify` workflow runs blocking verification checks.
3. The `Tests` workflow runs the broader test suite.
4. After `Verify` succeeds on `main`, the `Release` workflow runs the `version:canary` and `release:canary` package scripts and publishes the packages to the npm `canary` dist-tag.
5. Consumers can install the latest canary with `@polymarket/<package>@canary`.

This flow does not currently require adding a changeset file for each PR.

## Design Notes

- [`docs/sdk-direction.md`](./docs/sdk-direction.md) - current direction for `@polymarket/client`, package scope, and how the SDK should relate to Polymarket's existing API surfaces
- [`docs/open-questions.md`](./docs/open-questions.md) - unresolved SDK questions to revisit later

## TypeScript Config

- Root `tsconfig.json` and package-level `tsconfig.json` files are for editor tooling and source navigation.
- `tsconfig.build.json` files are the configs used by package build and typecheck commands.
- When changing build behavior, prefer updating `tsconfig.build.json`.

## License

This project is licensed under the [MIT License](./LICENSE).
