# CoachVault Engine 3.6.0 — Signed Private Document Uploads

This release replaces Vercel Blob `handleUpload` / client-token uploads for large files.

## Problem fixed

Repeated error:
`Vercel Blob: Failed to retrieve the client token`

The previous large-file architecture depended on the Vercel Blob client-token handshake.
CoachVault no longer uses that path.

## New architecture

For files <= 3.5 MB:
Browser -> CoachVault API -> Engine

For files > 3.5 MB and <= 10 MB:

1. Browser asks `/api/uploads/sign` for a short-lived signed PUT URL.
2. Server authenticates to Private Vercel Blob using project credentials/OIDC.
3. Signed URL is scoped to:
   - one pathname
   - PUT only
   - the selected content type
   - maximum 10 MB
   - approximately 15 minutes
4. Browser uploads directly to Private Blob using the signed URL.
5. Browser sends only the private blob pathname to CoachVault.
6. Engine retrieves it server-side using `get(..., { access:'private', useCache:false })`.
7. PDF proceeds through multimodal analysis.

## Why this is better

- No `@vercel/blob/client` token handshake
- Avoids Vercel Function request-size limits
- Private storage remains private
- Browser never receives store credentials
- Signed upload permission is narrow and temporary
- 10 MB CoachVault limit remains enforced

## Vercel SDK

Requires a current @vercel/blob version with Signed URL support.
The existing package target (^2.6.1) is new enough.
