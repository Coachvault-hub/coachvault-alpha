# CoachVault Engine 3.5.0 — Social Video Intelligence

Social-video ingestion is now treated as a core Engine capability.

## TikTok / Instagram ingestion
For recognized social videos CoachVault now requests three evidence streams in parallel:
1. Full-video visual/audio structured extraction
2. Timestamped transcript/captions
3. Unified social metadata

## What full-video extraction asks for
- central video purpose
- primary skill candidate
- concrete evidence for that skill
- on-screen instructional text
- demonstrated actions with approximate timestamps
- named drill/skill variations
- starting setup
- chronological sequence
- uncertainty / unsupported details

## Evidence priority
1. On-screen instructional text
2. Repeated demonstrated visual actions
3. Spoken/caption transcript
4. Creator caption/description
5. Thumbnail

## Primary-skill gate
A score of 85+ should require multiple concrete evidence points.
Incidental actions (for example a pass before a shot) should not displace the central teaching purpose.

## Anti-hallucination rule
CoachVault must not invent:
- backyard settings
- targets
- cones
- distances
- rep counts
- retrieval patterns
- generic mechanics
unless the source actually shows or states them.

## Technical note
Uses the existing SUPADATA_API_KEY.
The social video extraction endpoint is asynchronous, so the Engine polls for completion.
The route max duration is set to 60 seconds for short-form video analysis.
