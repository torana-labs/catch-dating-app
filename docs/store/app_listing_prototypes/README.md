---
doc_id: app_listing_screenshot_prototypes
owner: release_operations
status: active
---

# App Listing Screenshot Prototypes

This directory contains the first visual-review checkpoint for the Catch and
Catch Host store-listing screenshots. The six opaque 1320x2868 iPhone images
implement C01-C03 and H01-H03 from the approved
[`../app_listing_screenshot_production_brief.md`](../app_listing_screenshot_production_brief.md).

These are production prototypes, not upload-approved store assets. Final
release-build parity, legal review, store metadata, and upload approval remain
separate gates.

## Regeneration

```sh
swift tool/store/generate_app_listing_screenshot_prototypes.swift
swift tool/store/generate_app_listing_screenshot_prototypes.swift --check
```

The generator uses deterministic app captures and writes the six files under
`iphone_6_9/`. Source and output provenance is recorded in
[`asset_manifest.json`](asset_manifest.json).

## Review Order

1. Catch: events-first proposition, event confidence, attendance-gated Catches.
2. Catch Host: live console, guided publishing, admission controls.

Review the set at thumbnail size first, then inspect every source UI state at
full size. Copy changes belong in the production brief and generator together.
