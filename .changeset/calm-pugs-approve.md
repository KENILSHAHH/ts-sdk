---
"@polymarket/client": patch
---

Make `setupTradingApprovals` idempotent by checking existing ERC-20 allowances and ERC-1155 operator approvals before submitting transactions. The method now waits internally and returns a deprecated compatibility handle for callers that still call `wait()`.
