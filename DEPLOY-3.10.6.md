# Deploy CoachVault 3.10.6

This archive is intentionally FLAT.

When extracted, you should immediately see:
- app/
- public/
- standards/
- supabase/
- package.json
- COACHVAULT_BUILD.txt

Do not upload a parent folder containing those files inside it.

## Verify before PDF testing

After Vercel says deployment succeeded:

1. Open `/workspace`
2. Confirm the top-left says:
   `Engine 3.10.6 · BUILD 3106-A`

3. Open `/api/build`
4. Confirm:
   - engineVersion = 3.10.6
   - build = 3106-A

If either still shows 3.10.4 or 3.10.5, the issue is deployment routing
(branch / root directory / repository), not the CoachVault PDF code.

Only after both checks pass should the large PDF be uploaded again.
