# CoachVault Engine 3.5.8 — Protected Deployment Fix

Fixes the social-video error:
`Protected deployment`

## Cause

The asynchronous social-status API route was making a server-to-server HTTP request
back to the same Vercel deployment:

social-status -> https://deployment.vercel.app/api/engine/analyze

On a protected Vercel deployment, that new server request does not inherit the user's
browser authentication session, so Vercel Deployment Protection can reject it.

## New architecture

TikTok / Instagram URL
-> CoachVault starts Supadata extraction
-> browser polls CoachVault social-status route
-> social-status returns completed structured video evidence
-> authenticated browser posts evidence to relative `/api/engine/analyze`
-> CoachVault builds Coach Practice Card

There is no longer a server-to-self HTTP request.

## Benefits

- Works with Vercel Deployment Protection
- No bypass secret required
- No need to disable protection
- User's existing authenticated browser session is preserved
- Full-video evidence remains the basis for CoachVault analysis
