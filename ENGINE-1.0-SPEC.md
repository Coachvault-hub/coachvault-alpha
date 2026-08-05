# CoachVault Engine 1.0 Specification

## Mission
CoachVault Engine 1.0 converts raw coaching material into structured, coach-reviewable knowledge. It is designed to identify why a resource matters, what problem it solves, how it should be taught, and how it relates to other coaching knowledge.

## Engine pipeline

1. **Ingest** — Receive a transcript, pasted text, or supported media link.
2. **Detect** — Identify resource type and determine whether the source contains multiple assets.
3. **Diagnose** — Identify the player or team problem the material is intended to solve.
4. **Interpret purpose** — Determine the primary teaching objective.
5. **Classify** — Assign weighted purpose tags while rejecting incidental actions.
6. **Extract teaching knowledge** — Pull out concepts, setup, steps, cues, errors, progressions, regressions, and success indicators.
7. **Apply source discipline** — Separate stated facts, reasonable inferences, and unknowns.
8. **Connect** — Identify prerequisites, related concepts, and useful next resources.
9. **Review** — Present a coach-facing result for correction.
10. **Save** — Store the approved asset in the Vault.

## Core distinction

### Purpose
Why the coach would save and use the resource.

### Context
Where, when, and with whom the resource can be used.

A ball being picked up does not automatically make Ground Balls a purpose. A pass occurring does not automatically make Passing a purpose.

## Purpose weighting

- **90–100 — Core:** Removing the concept fundamentally changes the resource.
- **70–89 — Major:** The concept is clearly taught or evaluated.
- **45–69 — Supporting:** The concept is meaningfully trained but not central.
- **Below 45 — Incidental:** Normally omitted from searchable purpose tags.

## Knowledge objects extracted

- Resource identity
- Coaching problem
- Primary purpose
- Weighted purpose tags
- Omitted/incidental tags
- Coaching concepts
- Context and logistics
- Coaching cues
- Common mistakes
- Success indicators
- Progressions and regressions
- Safety notes
- Individual drills or segments
- Prerequisites
- Related concepts
- Recommended follow-up resources
- Source-stated facts
- Inferences requiring review
- Unknown information
- Confidence by analysis area

## Engine 1.0 testing standard

For each test source, compare the Engine result against a coach-created benchmark:

1. Why would a coach save this?
2. What player problem does it solve?
3. Which tags are truly purposes?
4. Which detected actions should be omitted?
5. Could another coach teach it from the extracted asset?
6. What did the Engine invent or miss?

Coach corrections should eventually be stored as evaluation data for future prompt and model improvements.
