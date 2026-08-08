# CoachVault Engine 3.4.1

## Recognized social sources

### TikTok
- Detects TikTok links explicitly.
- Uses TikTok's public oEmbed endpoint for creator, caption/title, thumbnail, and embed metadata.
- Sends the public thumbnail plus source metadata to the multimodal model when available.
- Keeps the original TikTok URL as the source.
- Does not pretend a single thumbnail proves the full motion sequence.

### Instagram
- Detects Instagram links explicitly.
- Attempts to retrieve public Open Graph metadata and thumbnail.
- Uses available metadata/thumbnail as evidence.
- Reports the platform as Instagram rather than failing as a generic web link.

### YouTube
- Retains transcript workflow and now reports source method/status consistently.

## Important limitation
Recognized source does not mean arbitrary public video bytes are available to CoachVault.
TikTok's public oEmbed API exposes metadata and an embed, not a general-purpose downloadable video stream.
This build progressively analyzes the public information that the platform exposes while preserving confidence and uncertainty.
