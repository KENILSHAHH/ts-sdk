# API Boundary Notes

- `GET /balance-allowance` currently returns `{ balance, allowances }`, where `allowances` is keyed by spender address. `clob-client` still models a single `allowance` string.
- `DELETE /cancel-market-orders` is documented in OpenAPI as requiring both `market` and `asset_id`, but `clob-client` examples use either field on its own. The SDK currently treats this request as a one-of filter and lets callers pass either or both.
- CLOB uses both `tokenId`/`token_id` and `assetId`/`asset_id` for the same CTF ERC1155 position identifier. Contract and order-entry shapes use `tokenId`, while older ledger, trade, and internal models still use `assetId`.
- `GET /prices-history` uses a `market` query parameter even when callers pass a CLOB token id rather than a condition id or Gamma market id.
- Authenticated CLOB notifications currently return `timestamp` as a string in live responses even though historical docs and models have treated it as a number.
- CLOB ID naming is inconsistent across legacy and unified surfaces. Legacy payloads still use forms like `orderID` and `tradeIDs`, while unified endpoints use `order_id` and `trade_ids`, and internal structs mix `Id` and `ID` spellings for the same identifier concepts.
- Order placement failures from reserved balance or allowance consumed by existing open orders are exposed only as free-form `ErrorMsg` text like `not enough balance / allowance`, sometimes with details such as `sum of active orders`. The API does not provide a stable structured reason that distinguishes wallet balance, allowance, open-order reservation, or matched-order reservation failures.
- `GET /auth/builder-api-key` is inconsistent across current references: legacy SDK consumers model it as builder key records with `key`, `createdAt`, and `revokedAt`, while the current auth docs describe a bare string array of active key ids. The SDK normalizes both shapes to builder key records.
