# CoachVault Engine 3.5.7 — Readable Social Errors

Fixes the user-visible error:
`[object Object]`

Cause:
Supadata can return structured JSON error objects. Previous CoachVault code sometimes
interpolated those objects directly into strings.

Changes:
- Extracts `message`, `details`, nested `error.message`, and related fields.
- Falls back to JSON serialization only when needed.
- Applies readable error handling in:
  - initial social-video extraction
  - asynchronous social-video polling
  - client-side Engine errors
- 429/rate-limit errors now stay readable and retain useful service detail.
