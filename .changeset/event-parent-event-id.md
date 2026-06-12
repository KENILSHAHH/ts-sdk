---
"@polymarket/bindings": minor
"@polymarket/client": minor
---

Expose `parentEventId` on `Event` so child events such as sports "more markets" events link back to their parent event. The value is normalized to the same `EventId` type as `Event.id`.
