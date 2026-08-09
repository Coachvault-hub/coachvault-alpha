# CoachVault Engine 3.7.0

## Unified visual system
The Workspace now carries the same black / yellow / gray design language as the public homepage.

## Clear navigation
Public and application surfaces now link clearly between:
- Home
- Workspace
- Season Roadmap

The CoachVault logo in the Workspace is a Home link.
The Workspace icon rail also includes Home and Roadmap shortcuts.

## Season Roadmap
New `/roadmap` page for club directors and coaches.

Director View:
- Add resources
- Choose season phase
- Set type: Form, Document, Link, Task, Meeting
- Add due/timing
- Set audience
- Add Google Form / Drive / web URL
- Mark required
- Remove resources

Coach View:
- Follow resources chronologically
- Open linked forms/resources
- Mark items complete
- See required-item progress

Prototype data persists in localStorage.

## Large PDF path
- Private Vercel Blob signed upload retained
- Large PDFs are passed to OpenAI by temporary signed file URL
- Background model changed to GPT-5.6
- Initial OpenAI response is parsed safely from text before JSON
- Errors now include stage, upstream status, and model where possible
- Background response polling remains in place

This build is intended to reveal the actual upstream error if large-PDF startup still fails,
instead of surfacing only `Unexpected server response (500)`.
