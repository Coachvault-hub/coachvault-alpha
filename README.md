# CoachVault v1.0 — Engine Lab

This build tests the core CoachVault workflow:

**Engine → Coach Review → Vault**

## What changed

- Automatic public YouTube transcript retrieval through Supadata (optional integration)
- AI fallback transcription when a native transcript is unavailable, handled by Supadata
- Purpose-first lacrosse taxonomy
- Weighted purpose tags
- Explicitly omitted incidental tags
- Multi-drill/segment breakdown
- Engine Report with strongest insight and review warnings
- Editable Coach Review before anything is saved to the Vault

## Vercel environment variables

Required:

```text
OPENAI_API_KEY=...
```

Recommended for automatic YouTube testing:

```text
SUPADATA_API_KEY=...
```

Optional:

```text
OPENAI_MODEL=gpt-4.1-mini
```

After adding or changing environment variables in Vercel, redeploy the project.

## YouTube behavior

With `SUPADATA_API_KEY`, CoachVault sends a public YouTube URL to Supadata using transcript mode `auto`. That attempts to use an existing transcript and falls back to AI transcription when necessary. Longer videos may return an asynchronous job; this prototype polls for up to about 48 seconds.

Without `SUPADATA_API_KEY`, paste a transcript under the YouTube URL. The CoachVault analysis pipeline is identical after transcript acquisition.

## Important prototype limitations

- The Vault is stored in browser local storage.
- File upload parsing is not connected yet.
- The taxonomy and weight rules are an initial coaching model that should be refined through real examples and coach corrections.
- Public, unrestricted videos work best. Private, age-restricted, member-only, and heavily geoblocked videos may fail.


## Engine 1.0
See `ENGINE-1.0-SPEC.md` for the new analysis model, knowledge objects, weighting rules, and testing standard.
