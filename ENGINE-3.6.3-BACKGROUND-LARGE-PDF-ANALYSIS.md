# CoachVault Engine 3.6.3 — Background Large-PDF Analysis

Large PDFs now use OpenAI Responses background mode rather than holding a Vercel request
open while the whole document is analyzed.

Flow:
signed private upload -> signed file_url -> OpenAI background Response -> response ID
-> browser polls CoachVault -> completed JSON -> CVIL reconciliation -> Coach Practice Card

The browser remains in the Engine progress experience while the job runs.
The coach does not need to upload the PDF again.

PDF file input uses detail=high so page diagrams and small text receive higher visual detail.
