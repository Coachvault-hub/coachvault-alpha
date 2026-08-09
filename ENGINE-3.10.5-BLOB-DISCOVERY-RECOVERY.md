# CoachVault Engine 3.10.5 — Blob Discovery & Recovery

Addresses:

`CoachVault securely stored ... but Vercel could not reopen the private file (Blob status unknown).`

## What "status unknown" meant

Vercel Blob SDK `get()` returns `null` when the requested blob cannot be found.
Therefore the 3.10.4 message was not a stream-format problem; the SDK did not
resolve an object for the pathname CoachVault supplied.

## 3.10.5 recovery behavior

1. Retry the exact private pathname four times with short backoff.
2. If `get()` still returns null, call `list()` on:
   `coachvault-ingestion/`
3. Search the returned private Blob metadata for:
   - exact pathname
   - matching original filename
4. If found, reopen the blob using Vercel's returned URL/pathname.
5. Continue:
   Private Blob -> OpenAI Files API -> file_id -> background Responses API.

## New failure diagnostics

If recovery fails, the JSON diagnostic includes:
- `requestedBlobPathname`
- `resolvedBlobIdentifier`
- `blobDiscovery.listedCount`
- `blobDiscovery.matchedPathname`
- `blobDiscovery.matchedUrl`
- `blobDiscovery.listError` if listing itself fails

If `list()` sees zero matching files while the browser PUT reported success,
that strongly indicates the signed upload and the analysis Function are
authenticating against different Blob store contexts.
