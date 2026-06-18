---
'@polymarket/client': minor
---

Refactor environment configuration into REST and websocket endpoint objects with optional headers. Add `forkEnvironmentConfig` for deriving custom environments from production, export `staging`, and move deployed protocol addresses under `environment.contracts` while keeping `walletDerivation` top-level.
