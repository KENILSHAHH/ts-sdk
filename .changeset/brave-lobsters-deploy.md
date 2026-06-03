---
"@polymarket/client": patch
---

Default `createSecureClient` to the authenticated signer's current deterministic Deposit Wallet when no wallet is provided. The client now derives the current Deposit Wallet at runtime, deploys it when needed, and preserves explicit EOA and existing wallet behavior.
