# CoachVault Engine 3.10.2 — Large PDF ReferenceError Fix

Fixes the user-visible error:

`CoachVault received a non-JSON server error (500).`

## Exact root cause

The large Blob-backed PDF branch correctly stopped downloading the PDF into the
Vercel Function, but stale code remained immediately afterward:

    body.text = bytes.toString('utf8')
    body.uploadedBinary = bytes.toString('base64')

There is no `bytes` variable in the Blob-backed branch.

That caused a JavaScript `ReferenceError` before the route entered its main diagnostic
try/catch. Vercel therefore returned its own generic 500 response instead of CoachVault JSON.

## Correct 3.10.2 behavior

Large PDF (> ~3.5 MB):
browser -> signed private Blob PUT -> pathname -> signed private GET URL
-> OpenAI background file_url input

The Vercel Function never downloads or base64-encodes the large PDF.

Small direct PDF:
browser -> multipart request -> bytes -> base64 -> OpenAI multimodal input

Text file:
browser -> multipart request -> bytes -> UTF-8 text

## Additional hardening

Malformed JSON requests now return a CoachVault JSON diagnostic with:
`stage: request-parse`

instead of escaping as an unhandled server exception.
