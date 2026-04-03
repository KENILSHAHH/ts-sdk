# Polymarket SDK

The Polymarket SDK is a pnpm monorepo for the core TypeScript client and runnable example applications.

## Monorepo Structure

This repository is organized as a pnpm workspace with packages for the SDK itself and apps for runnable examples.

| Package | Description |
| --- | --- |
| [`packages/client`](./packages/client) | Core TypeScript client package for the Polymarket SDK |
| [`examples/react`](./examples/react) | React + Ladle example app for exploring the SDK |

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

## License

This project is licensed under the [MIT License](./LICENSE).
