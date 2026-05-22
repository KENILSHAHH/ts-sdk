# Polymarket SDK

This repository is the home for Polymarket's official TypeScript SDK packages.

## Beta Status

The TypeScript SDK is currently in beta. We are working toward a stable public API and will use feedback during the beta period to refine the developer experience.

We welcome bug reports, feature requests, and general feedback through GitHub Issues. Please use the provided issue templates so we can triage reports consistently.

## Repository Structure

This repository is organized as a pnpm workspace with packages for the SDK itself and apps for runnable examples.

| Package                                    | Description                                                    |
| ------------------------------------------ | -------------------------------------------------------------- |
| [`packages/client`](./packages/client)     | Official TypeScript client for building on Polymarket          |
| [`packages/types`](./packages/types)       | Shared TypeScript types for SDK packages                       |
| [`packages/bindings`](./packages/bindings) | Internal generated API bindings; not intended for direct usage |
| [`examples/react`](./examples/react)       | React + Ladle example app for exploring the SDK                |

For installation and usage, see [`packages/client`](./packages/client).

## Local Development

### Requirements

- Node.js `>=24`
- pnpm `>=10`

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
pnpm dev:react
```

Build all workspace packages:

```bash
pnpm build
```

### Development Scripts

The root scripts are:

- `pnpm dev:react` - start the Ladle examples in `examples/react`
- `pnpm build` - build all workspace packages that expose a build script
- `pnpm clean` - remove package build output from `packages/*/dist`

## TypeScript Config

- Root `tsconfig.json` and package-level `tsconfig.json` files are for editor tooling and source navigation.
- `tsconfig.build.json` files are the configs used by package build and typecheck commands.
- When changing build behavior, prefer updating `tsconfig.build.json`.

## Maintainer Notes

### Publishing

Publishing is managed by the Changesets GitHub Action. Packages are published to npm through trusted publishing.

## License

This project is licensed under the [MIT License](./LICENSE).
