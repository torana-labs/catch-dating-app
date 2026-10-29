Catch design context pack

Upload surface for Claude Design and other AI design tools. This pack is generated
from the live Flutter design system; do not edit generated files by hand.

Use the design_system files to establish or refresh the organization-level design
system. Use design_system/components.json as the allowed Catch primitive
contract list for handoffs. For the live Badge + Field synchronization spike,
use design_system/claude_design_handoff_request.json and return exactly its
machine-checkable receipt contract. Use gallery shots as per-screen taste
anchors during a redesign chat.

Generated sources:
- docs/design_language.md
- design/components/catch.components.json
- packages/catch_tokens/lib/catch_tokens.dart
- lib/platform/theme/activity_palette.dart
- packages/catch_ui/lib/src/foundations/catch_text_styles.dart
- packages/catch_ui/lib/src/foundations/catch_fonts.dart
- test/ui_captures/catalog/screen_capture_catalog.dart

Regenerate:
node tool/design/build_context_pack.mjs

Check drift:
node tool/design/build_context_pack.mjs --check

Render high-DPR gallery PNGs when needed:
node tool/ui_capture/run_captures.mjs --profile design-gallery
