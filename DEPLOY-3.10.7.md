# CoachVault 3.10.7 — Explicit Blob Store Binding

## Why this release exists

3.10.6 proved the browser can complete the signed PUT but the analysis function
cannot see the uploaded object with its current Blob credentials.

Vercel allows multiple Blob stores in one project. Each store has its own token.

3.10.7 makes upload signing and analysis reads use the exact same explicit token.

## Recommended Vercel environment variable

In the SAME CoachVault Vercel project, create:

COACHVAULT_BLOB_READ_WRITE_TOKEN

Set it equal to the Read/Write token for the PRIVATE Blob store you want CoachVault
to use.

If that variable is absent, CoachVault falls back to BLOB_READ_WRITE_TOKEN.

## Verify BEFORE PDF upload

1. Open /workspace
   Must show:
   Engine 3.10.7 · BUILD 3107-BLOB

2. Open /api/build
   Must show 3.10.7 / 3107-BLOB

3. Open /api/blob-status

It will safely show:
- which environment variable is being used
- a one-way 12-character token fingerprint
- how many `coachvault-ingestion/` blobs the server can see
- the host/path metadata for recent blobs

It does NOT expose the Blob token.

## What to look for

If `/api/blob-status` shows zero ingestion blobs after a browser upload reports success,
then the signed PUT is targeting a different store from the read token.

With 3.10.7 both code paths are explicitly bound to the same token, eliminating the
SDK-default ambiguity once COACHVAULT_BLOB_READ_WRITE_TOKEN is configured.
