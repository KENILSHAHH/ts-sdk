---
"@polymarket/bindings": patch
"@polymarket/client": patch
---

Model activity trades as an `isCombo`-discriminated union so Combo trade activity rows parse without binary market metadata.
