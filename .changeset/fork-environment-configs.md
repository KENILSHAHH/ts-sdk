---
'@polymarket/client': minor
---

Refactor environment configuration into REST and websocket endpoint objects with optional headers. Add support for deriving custom environments from production, keep `preproduction` as a production fork, and move deployed protocol addresses under `environment.contracts` while keeping `walletDerivation` top-level.
