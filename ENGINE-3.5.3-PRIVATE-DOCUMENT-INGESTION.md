# CoachVault Engine 3.5.3 — Private Document Ingestion

CoachVault large-file ingestion now uses private Vercel Blob storage.

## Flow

Small files:
Browser -> CoachVault Engine request

Large files (>3.5 MB, <=10 MB):
Browser -> Vercel Private Blob
        -> CoachVault receives only the private Blob URL/reference
        -> Server-side Engine retrieves the private file with Blob authorization
        -> PDF is analyzed multimodally

## Privacy
Large coaching documents are not uploaded as public Blob objects.

The coach-facing workflow is unchanged:
1. Choose file
2. Analyze with CoachVault
3. Upload progress appears for larger documents
4. Engine analysis begins automatically

## Limit
10 MB per document.

## Vercel prerequisite
A Private Vercel Blob store must be connected to the production CoachVault project.
After connecting the store, redeploy Production so the Blob authentication/OIDC
configuration is available to the running deployment.

## Diagnostics
/api/uploads/status

This reports:
- whether Blob auth is visible
- auth mode
- storage mode = Private Blob

It never returns credentials.

## Future cleanup
Temporary ingestion blobs should later receive lifecycle cleanup after the resource
has been extracted into CoachVault's persistent database.
