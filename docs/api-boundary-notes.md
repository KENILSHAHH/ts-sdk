# API Boundary Notes

- `GET /balance-allowance` currently returns `{ balance, allowances }`, where `allowances` is keyed by spender address. `clob-client` still models a single `allowance` string.
