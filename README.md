# CoachVault v0.5 — Engine Test

This release reorganizes CoachVault around two core spaces:

- **Engine:** raw material enters, AI analyzes it, and the coach reviews the result.
- **Vault:** approved coaching assets live, remain searchable, and can receive larger edits.

## Live v0.5 test

The Engine can:

1. Accept a YouTube URL.
2. Retrieve the title, creator, thumbnail, and transcript when YouTube makes captions available.
3. Send the transcript to the OpenAI API.
4. Produce a structured coach-review asset.
5. Score purpose tags from 45–100.
6. Save the reviewed asset to the browser-based Vault.

It also analyzes pasted text.

## Vercel setup

Add this environment variable under **Project Settings → Environment Variables**:

- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — optional; defaults to `gpt-4.1-mini`

Redeploy after adding the variable.

## Important limitation

YouTube sometimes blocks transcript retrieval or a video may not have captions. The interface includes an optional transcript field so the same video can still be tested by pasting its transcript.

## Tagging model

Purpose tags are intentionally different from context metadata.

A tag should be applied because the concept is a teaching objective, not merely because it occurs. For example, a drill is not tagged `Ground Balls` simply because players scoop a ball. The tag is appropriate when ground-ball technique, competition, recovery, or transition from the ground ball is central to the drill.

Weights:

- 90–100: core purpose
- 70–89: major purpose
- 45–69: supporting purpose
- below 45: omitted
