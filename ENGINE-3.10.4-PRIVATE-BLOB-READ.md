# CoachVault Engine 3.10.4 — Private Blob Status-Aware Read

Fixes / diagnoses:

`CoachVault securely stored ... but Vercel returned no readable stream for the private file.`

## What changed

Vercel Blob `get()` returns a structured result containing:
- `statusCode`
- `stream`
- blob metadata

A null stream is not by itself a complete error condition. For example, a 304 can
return `stream: null`.

3.10.4 now:

1. Checks `statusCode` explicitly.
2. Retries a 304 / anomalous 200-without-stream once with `useCache:false`.
3. Returns the actual Blob status in the CoachVault error.
4. Includes the pathname and whether a stream existed in diagnostics.
5. Supports either:
   - Web `ReadableStream` (`getReader()`)
   - Node/async-iterable readable streams
6. Transfers the successfully-read PDF to OpenAI Files API exactly as in 3.10.3.

## Diagnostic outcomes

If the next failure occurs at this step, CoachVault will now report:

`Blob status 304`
`Blob status 404`
`Blob status 403`
etc.

That will distinguish cache behavior from a pathname/store/authentication issue.
