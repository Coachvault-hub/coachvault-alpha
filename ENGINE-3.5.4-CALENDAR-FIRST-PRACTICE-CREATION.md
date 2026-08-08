# CoachVault Engine 3.5.4 — Calendar-First Practice Creation

## New calendar interaction

A coach can now start a practice directly from the calendar.

Flow:

Calendar -> click blank day -> "Create practice?" -> Practice Builder
         -> build/review practice -> Save Practice
         -> automatically added to the original calendar date

## Important behavior

Scheduling remains optional.

The existing flows still work:
- Build -> Save without a date
- Build -> Save -> Add to Calendar
- Open a saved Practice -> Add to Calendar

The new calendar-first path is simply another entry point.

## Reserved date

When the coach enters the Practice Builder from the calendar, CoachVault displays
a reserved-date banner showing the selected date and explains that saving the plan
will add it to the calendar.

The coach can remove the reserved date before saving.

## Blank-day UX

Blank calendar days are clickable.
On hover/focus they reveal:
`+ Create practice`

Days that already contain practices are not treated as blank-day creation targets
in this prototype.
