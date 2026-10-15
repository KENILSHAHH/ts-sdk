---
"@polymarket/client": patch
---

Add experimental per-read `timeout` alongside `signal`. Pass milliseconds or `false` to disable the timeout for each HTTP request, including pagination and RPC reads. Omitting it preserves the transport default.
