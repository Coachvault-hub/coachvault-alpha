# CoachVault Engine 3.3.0

This update integrates the current CoachVault Diagram Standard research and begins first-class file upload.

New concepts:
- participationMode vs drillType
- progressionBehavior
- participantState
- lineRole
- stagingZone
- entryPoint
- coneFunction
- expanded fieldTemplate vocabulary

New diagram rules:
- earliest stable setup frame
- radial queue geometry
- live-play staging
- entry point != live position
- progressive accumulation
- queue by drill role rather than roster position
- cone function classification
- functional vs template-only field elements

File upload:
- PDF, images, TXT, DOC/DOCX, PPT/PPTX accepted in UI
- multipart upload path wired
- TXT can be analyzed immediately
- binary document/image transport is wired conservatively
- unsupported binary extraction must return diagnostics rather than fabricated analysis
