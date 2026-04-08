# API Boundary Notes

- `GET /balance-allowance` currently returns `{ balance, allowances }`, where `allowances` is keyed by spender address. `clob-client` still models a single `allowance` string.
- `DELETE /cancel-market-orders` is documented in OpenAPI as requiring both `market` and `asset_id`, but `clob-client` examples use either field on its own. The SDK currently treats this request as a one-of filter and lets callers pass either or both.
- CLOB uses both `tokenId`/`token_id` and `assetId`/`asset_id` for the same CTF ERC1155 position identifier. Contract and order-entry shapes use `tokenId`, while older ledger, trade, and internal models still use `assetId`.
- CLOB ID naming is inconsistent across legacy and unified surfaces. Legacy payloads still use forms like `orderID`, while unified endpoints use `order_id`, and internal structs mix `Id` and `ID` spellings for the same identifier concepts.
