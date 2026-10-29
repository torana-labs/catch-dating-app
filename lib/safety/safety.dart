// ignore_for_file: directives_ordering

/// Catch Safety feature — public API barrel.
///
/// Re-exports the primary domain types, repositories, screens, and key
/// presentation artifacts consumers outside `lib/safety/` rely on.
///
/// Prefer importing this barrel from outside the feature. Code within
/// `lib/safety/` should import specific files to keep dependency edges
/// explicit.
library;

// ── Domain models ───────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/safety/domain/blocked_user.dart';

// ── Data ────────────────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';

// ── Presentation — screens ──────────────────────────────────────────────────
export 'presentation/settings_screen.dart'; // public-api: route entry point exposed to app routing

// ── Presentation — controllers & state ──────────────────────────────────────
export 'presentation/settings_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/settings_account_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/settings_keys.dart'; // public-api: presentation value/helper API used across feature boundaries
