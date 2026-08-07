# CoachVault Engine 3.2.7

Sprint 4.2 polish release.

## Live Engine Analysis
- Seven stages now advance at an equal 2.4-second cadence.
- The final confidence/review stage is displayed before the result appears.
- The sequence no longer races through early stages and stalls on the last stage.

## CoachVault branding
- Supplied CoachVault logo added to the application header.
- Transparent CoachVault logo added as a subtle field-diagram watermark.

## Field setup
- SVG viewbox now includes space outside field boundaries so stationary queues remain visible.
- Outer-boundary queue directions are enforced by geometry.
- Interior staging lines still use Engine-provided queue direction.
- Added queue geometry validation rules for restraining-line staging.
