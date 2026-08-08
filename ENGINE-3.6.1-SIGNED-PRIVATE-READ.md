# CoachVault Engine 3.6.1 — Signed Private Read

Fixes the failure:

`CoachVault securely stored <file>.pdf, but could not open the private file for analysis.`

## What changed

3.6.0:
signed PUT -> Private Blob -> SDK get() -> Engine

3.6.1:
signed PUT -> Private Blob -> signed GET -> Engine

The upload already proved that the Vercel project can mint signed Blob access.
3.6.1 uses that same signed-access model to open the freshly uploaded PDF.

## Private read

CoachVault mints a GET URL scoped to:
- the exact uploaded pathname
- GET only
- approximately 5 minutes

The Engine fetches that URL once and immediately converts the PDF to the multimodal
file input used for analysis.

The PDF remains private. There is no permanent public read URL.

## Diagnostics

If the read still fails, CoachVault now returns:
- HTTP status from Blob
- a short response body when available
- error code `SIGNED_PRIVATE_READ_FAILED`
- stage `private-read`

This should make any remaining storage issue directly diagnosable.
