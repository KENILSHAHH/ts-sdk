# Open Questions

Use this document to capture unresolved SDK questions that should be revisited later.

## Current Questions

- For CLOB, do any public endpoints return different data when the request is authenticated versus unauthenticated?
- In `clob-client`, what is server time used for, and is it required for the SDK authentication flow?
- CLOB docs say: "All query endpoints require L2 authentication. Builder-authenticated clients can also query orders attributed to their builder account using the same methods." Does builder authentication alone suffice for any standard private query endpoints, or is it only additive to L2 auth? Current backend and `clob-client` behavior appear to require L2 first.
- What are the intended use cases for deriving or creating more than one API key per wallet? Current docs and `clob-client` guidance seem to suggest repeated key creation should generally not be needed.
- How many existing builders or integrators rely on `clob-client` with `throwOnError: true`, given that it changes the effective behavior of helpers like `createOrDeriveApiKey()`?
- What are the intended product and SDK use cases for readonly user API keys, and should they be part of the first `@polymarket/client` release at all?
