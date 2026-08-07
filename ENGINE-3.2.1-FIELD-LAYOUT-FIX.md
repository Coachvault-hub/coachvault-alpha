# CoachVault Engine 3.2.1

Fixes the CPC-002 Field Layout Generator wiring.

## Fixed

- Coach Practice Card now renders `coachPracticeCard.fieldLayout`
- Removed the old text-only field diagram placeholder
- Engine output schema now requires structured field layout data
- Player, cone, ball, coach, movement, pass, and rotation arrays are explicit
- Field prompt now requires populated starting positions when the source supports them
- Four-line and four-corner drills now preserve all base starting groups
- Randomized drills use representative movement rather than drawing every variation
