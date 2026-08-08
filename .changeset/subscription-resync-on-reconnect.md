---
'@polymarket/client': minor
---

Subscription handles now yield a `SubscriptionResyncEvent` (`{ topic: 'subscription', type: 'resync', reason: 'reconnect' }`) after the SDK reconnects and resubscribes a lost WebSocket connection. Events published during the outage were never delivered; previously the reconnect was invisible, so consumers maintaining state from the stream (order books, open orders, scores) could silently diverge. Handle it by refetching state that assumes lossless delivery, or ignore it if gaps don't matter for your use. Exhaustive `switch` statements over event topics need a `'subscription'` case.
