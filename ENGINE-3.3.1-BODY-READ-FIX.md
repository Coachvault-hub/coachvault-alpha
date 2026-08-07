# CoachVault Engine 3.3.1

Fixes the file-upload request handling bug:

`Body is unusable: Body has already been read`

The analyze route now reads each request body exactly once:

- multipart uploads -> `request.formData()`
- normal link/text requests -> `request.json()`

All downstream logic works from the parsed `body` object instead of attempting to read the Request again.
