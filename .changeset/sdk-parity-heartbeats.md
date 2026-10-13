---
"@polymarket/bindings": minor
"@polymarket/client": minor
---

Add authenticated modern and legacy order heartbeat methods. Modern ID-mismatch errors expose the current heartbeat ID for caller recovery; callers own scheduling and ID serialization.

The first accepted send enables API-key-wide timeout cancellation; there is no disarm operation. Each call sends one request, and callers must maintain the heartbeat loop. Cancellation after expiry is best effort. OrderHeartbeatMismatchError now reports its own runtime name while retaining RequestRejectedError inheritance.
