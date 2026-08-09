# CoachVault Engine 3.6.5 — Workspace Import Fix

Fixes the Vercel build error:

Module not found: Can't resolve './cvil'

## Cause

In 3.6.4 the working CoachVault application moved from:

app/page.js

to:

app/workspace/page.js

The CVIL module remained at:

app/cvil.js

The moved page still imported it as:

./cvil

which is no longer correct from the new directory.

## Fix

The workspace now imports:

../cvil

All 3.6.4 homepage work and 3.6.3 large-PDF background analysis remain included.
