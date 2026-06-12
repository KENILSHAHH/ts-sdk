---
"@polymarket/bindings": patch
"@polymarket/client": patch
---

Handle legacy multi-outcome markets in market responses. `listMarkets` now omits markets that cannot be represented by the binary `Market` model instead of aborting the whole page, and `fetchMarket` fails with a typed `UnexpectedResponseError` instead of a raw `TypeError`.
