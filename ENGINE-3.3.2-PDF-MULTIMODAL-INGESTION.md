# CoachVault Engine 3.3.2

## PDF ingestion fix

PDF files are now sent directly to OpenAI as file inputs rather than being required
to produce plain sourceText first.

For PDFs, CoachVault can analyze:
- extracted document text
- page images
- drill diagrams
- multi-frame progressions

The Engine uses gpt-4.1 for PDF analysis and gpt-4.1-mini for existing text/link flows.

## Setup interpretation

For multi-page drill diagrams:
- use the earliest complete stable frame for Field Setup
- use later frames to understand progression and Run the Drill
- inspect both text and visual diagrams

## Current upload support

- TXT: direct text analysis
- PDF: multimodal text + page-image analysis
- Other binary formats: upload is accepted, but user is asked to export as PDF until visual extraction is enabled
