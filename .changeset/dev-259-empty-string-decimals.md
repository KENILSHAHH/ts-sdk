---
"@polymarket/bindings": patch
"@polymarket/client": patch
---

Normalize empty-string decimal fields from order and trade responses: order `makingAmount`/`takingAmount` map `""` to `"0"`, and maker order `feeRateBps` maps `""` to `null`, matching py-sdk behavior.
