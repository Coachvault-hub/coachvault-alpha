# CoachVault Engine 3.10.3 — OpenAI File Transfer

Fixes:

`Large-document analysis ended before completion: Failed to download file.`

## Root cause

The large PDF was successfully stored privately in Vercel Blob, but the model service
could not reliably download the temporary Vercel URL.

The architecture no longer asks OpenAI to fetch from Vercel.

## New large-PDF architecture

1. Browser uploads large PDF directly to Vercel Private Blob.
2. CoachVault receives the Blob pathname.
3. Server reopens the private PDF with:

   get(pathname, {
     access: 'private',
     useCache: false
   })

4. CoachVault reads the stream into memory.
5. CoachVault uploads the PDF to OpenAI Files API with purpose `user_data`.
6. OpenAI returns a `file_id`.
7. CoachVault starts the background Responses job using `input_file.file_id`.
8. Browser polls the background response until complete.
9. Result is reconciled against CVIL.

## Why this should be more reliable

OpenAI never downloads the PDF from Vercel.

The only cross-service transfer is an authenticated server upload from CoachVault to
OpenAI's Files API.

## Diagnostics

Failure stages now distinguish:
- `private-blob-read`
- `openai-file-upload`
- `openai-background-start`
- `openai-background-poll`

## Limit

CoachVault large-document test limit remains 10 MB.
