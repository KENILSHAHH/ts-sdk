# API Boundary Notes

- `GET /balance-allowance` currently returns `{ balance, allowances }`, where `allowances` is keyed by spender address. `clob-client` still models a single `allowance` string.
- `DELETE /cancel-market-orders` is documented in OpenAPI as requiring both `market` and `asset_id`, but `clob-client` examples use either field on its own. The SDK currently treats this request as a one-of filter and lets callers pass either or both.
