# CoachVault Engine 3.10.0 — Team & Club Form Sharing

## Coach -> Team

Coaches can share a CoachVault form to their team.

The team share:
- defaults to the logged-in coach's team
- creates a response link
- can be sent by text/email/team messaging
- does not grant recipients Workspace access
- can allow parents/players to respond without CoachVault accounts

## Director -> Team / Club / Public

Directors can publish a form link for:
- Entire Club
- Specific Team
- Public / Open Link

Directors can:
- create multiple active links for the same form
- copy each link
- preview it
- disable a link
- see the number of active form shares

## Public responder experience

New route:
`/form/[token]`

Recipients see:
- CoachVault-branded form
- name/email respondent fields
- optional team/group field
- all advanced CoachVault field types
- conditional IF/THEN show/hide logic
- confirmation screen after submission

They do not see the CoachVault Workspace.

## Production Supabase model

Schema now includes:
- `form_shares`
- share token
- scope: team / club / public
- optional team
- anonymous-response setting
- expiration field
- response linkage back to the share

For production anonymous links, the recommended implementation is:
public form -> server API -> Supabase service-role validation/submission.

Do NOT expose broad anonymous SELECT/INSERT permissions directly on the Supabase tables.

## Demo Mode limitation

Until Supabase is connected, share records and responses are stored in browser localStorage.
Therefore a demo share URL is only resolvable in the same browser/storage profile that created it.

Once Supabase is connected, share links become truly cross-device and can be sent to anyone.
