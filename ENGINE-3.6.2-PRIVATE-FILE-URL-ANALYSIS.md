# CoachVault Engine 3.6.2 — Private File URL Analysis

Fixes:
`CoachVault securely stored ...pdf, but could not create or use the temporary private read link. fetch failed`

## Root issue
The large PDF upload succeeded.
The failure happened when the Vercel Function tried to fetch the newly signed private
Blob URL back into itself.

CoachVault no longer does that.

## New large-PDF path

Browser
-> signed private PUT
-> Vercel Private Blob
-> CoachVault mints 10-minute signed GET URL
-> OpenAI Responses API receives the URL as `input_file.file_url`
-> model reads PDF text + page visuals directly
-> CoachVault receives structured JSON analysis

## Why
OpenAI Responses supports PDF/file inputs by URL.
Vercel Private Blob signed URLs provide narrow, temporary access to one private object.

This removes:
- private Blob download through the Vercel Function
- 10 MB server memory/base64 expansion
- the network hop that produced `fetch failed`

## Privacy
The blob remains private.
The read URL:
- is scoped to the exact PDF
- permits GET only
- expires after approximately 10 minutes

## Limits
CoachVault test limit remains 10 MB.
