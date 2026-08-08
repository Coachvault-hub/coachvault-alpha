# CoachVault Engine 3.5.2 — Blob Connection Diagnostics

## Better coach-facing errors
Raw Vercel errors such as:
`Vercel Blob: Failed to retrieve the client token`

are now translated to:

`Large-file storage is not connected correctly to this CoachVault deployment.
In Vercel, open the Blob store, confirm the CoachVault production project is
connected, upgrade the connection to OIDC if offered, then redeploy.`

## Diagnostic endpoint
`/api/uploads/status`

Reports whether the running deployment can see:
- VERCEL_OIDC_TOKEN
- BLOB_READ_WRITE_TOKEN
- Vercel runtime

It never returns token values.

## Recommended Vercel check
Blob Store -> Projects -> CoachVault project -> ... -> Upgrade to OIDC (if offered)
Then redeploy Production.

New Vercel Blob connections use OIDC by default.
