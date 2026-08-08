# CoachVault Engine 3.5.6 — Social Video Reliability

This release fixes two distinct social-video ingestion problems:

1. Supadata HTTP 429 rate limits
2. Long-running extraction jobs being treated as failures

## Why 429 happened
The prior build launched metadata, transcript, and full-video extraction in parallel.
Supadata Free is limited to 1 request/second. That burst can trigger a 429 immediately.

## New request strategy
TikTok/Instagram:
1. Platform metadata from TikTok/Instagram source handler
2. Full-video extraction as the primary Supadata request
3. Wait >= 1.2 seconds
4. Transcript is supplemental/fallback, not a simultaneous request

## Rate-limit handling
- All Supadata requests use retry/backoff for HTTP 429.
- Retry-After is honored when supplied.
- Polling uses 2.5-second client intervals.
- 429 during polling is treated as "still working", not Engine failure.

## Long-running video jobs
If extraction does not complete during the initial short server wait:
- CoachVault returns a persistent job ID
- UI remains in the seven-stage Engine progress state
- browser checks the saved job automatically
- when full-video evidence is ready, CoachVault builds the Practice Card
- user does NOT need to paste the TikTok/Instagram link again

## Evidence
Full-video extraction remains the primary evidence source:
1. on-screen instructional text
2. repeated demonstrated actions
3. audio/transcript
4. post metadata

## No quality downgrade
CoachVault does not silently fall back to thumbnail-only analysis when full-video extraction
is simply still processing.
