# CoachVault Engine 3.9.0 — Advanced Roadmap Forms

## Phase-first form creation

The global "Build Form" button has been removed from the Roadmap toolbar.

Each season phase now has its own action:
- Build Form for Preseason Setup
- Build Form for Equipment & Apparel
- Build Form for Season Planning
- Build Form for Team Management
- Build Form for In Season
- Build Form for Postseason

Forms launched from a phase inherit that phase automatically.

## Advanced field types

CoachVault Forms now support:
- Short answer
- Long answer
- Email
- Phone
- Number
- Date
- Time
- Dropdown
- Multiple choice
- Checkboxes
- Yes / No
- Rating scale
- Acknowledgement
- Section headings

## IF / THEN conditional logic

Questions can be configured with conditional visibility.

Example:
IF "Do you need helmets?" equals "Yes"
THEN show "How many helmets do you need?"

Current operators:
- equals
- does not equal
- contains
- is answered
- is not answered

Only previous questions can be used as logic triggers, preventing circular dependencies.

Hidden conditional questions are omitted from the saved submission.

## Richer starter templates

Updated:
- Coach Profile & Bio
- Helmet Ordering
- Tournament Selection
- Practice Availability

These now demonstrate sections, branching logic, choices, scales, and acknowledgements.

## Future logic direction

The current engine handles show/hide branching. The data model is intentionally structured
so future actions can include:
- make question required
- skip to section
- end form
- assign follow-up task
- notify director
- create another roadmap item
- route by team / role
