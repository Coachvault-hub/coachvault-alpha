# CoachVault Engine 3.10.1 — Form Builder Build Fix

Fixes the Vercel JSX syntax error in `app/roadmap/page.js`.

Cause:
A stale duplicate JSX fragment remained after the advanced form-builder question map
during the 3.10.0 sharing update.

Fix:
- Removed the orphaned duplicate fragment.
- Restored exactly one valid `))}` closing expression for the form field map.
- Preserved advanced fields and IF / THEN conditional logic.
- Preserved Coach -> Team sharing.
- Preserved Director -> Team / Club / Public sharing.
- Preserved the public `/form/[token]` response page.
