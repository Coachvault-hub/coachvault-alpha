# CoachVault Engine 3.5.1 — Large Document Ingestion

This build replaces the earlier 3.5.1 "4 MB warning" concept.

## Why
Vercel Functions have an inbound request-body limit around 4.5 MB.
CoachVault should support coaching manuals, clinic packets, playbooks, and multi-drill PDFs that exceed that limit.

## New architecture

Small file:
Browser -> CoachVault analyze route -> Engine

Large file:
Browser -> Vercel Blob (direct client upload)
        -> CoachVault receives only the Blob URL
        -> CoachVault retrieves document server-side
        -> Engine analyzes PDF text + page images

The large file bytes never pass through the inbound Vercel Function request.

## Current test limit
10 MB per document.

This is deliberately much larger than the old ~4 MB request path while remaining conservative for the downstream multimodal analysis step.

## One Vercel setup step required
Connect a Vercel Blob store to the CoachVault project.

Vercel Dashboard:
1. Open the CoachVault project.
2. Storage -> Create / Connect Blob.
3. Connect it to this project.
4. Redeploy.

Modern Vercel Blob stores can use project OIDC; older stores may add BLOB_READ_WRITE_TOKEN automatically.

## New dependency
@vercel/blob ^2.6.1

## UX
- Files under 3.5 MB continue using the fast direct route.
- Larger files automatically switch to direct Blob upload.
- Upload progress is shown in CoachVault.
- The coach does not need to know which transport is being used.

## Next
Large multi-drill PDFs should feed a document-ingestion queue:
document -> detect resources -> review candidates -> approve selected resources.
