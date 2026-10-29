// ignore_for_file: directives_ordering

/// Swipes (Catches) feature — public API barrel.
///
/// Re-exports the primary domain types, repositories, screens, and key
/// presentation artifacts consumers outside `lib/swipes/` rely on.
///
/// Prefer importing this barrel from outside the feature. Code within
/// `lib/swipes/` should import specific files to keep dependency edges
/// explicit.
library;

// ── Domain models ───────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
export 'package:catch_dating_app/contexts/connections/domain/swipe_extensions.dart';
export 'package:catch_dating_app/contexts/connections/domain/swipe_window.dart';

// ── Data ────────────────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
export 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';

// ── Presentation — screens ──────────────────────────────────────────────────
export 'presentation/event_recap_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/filters_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/swipe_screen.dart'; // public-api: route entry point exposed to app routing

// ── Presentation — view models & controllers ────────────────────────────────
export 'presentation/event_recap_view_model.dart'; // public-api: read-model seam for route composition
export 'presentation/filters_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/filters_screen_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/swipe_queue_controller.dart'; // public-api: presentation value/helper API used across feature boundaries

// ── Presentation — widgets commonly reused outside the feature ──────────────
export 'presentation/swipe_empty_content.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/catches_pass_button.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/swipe_empty_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'shared/profile_surface/profile_card_content.dart';
export 'shared/profile_surface/profile_card_style.dart';
export 'shared/profile_surface/profile_reaction_action.dart';
export 'shared/profile_surface/profile_surface.dart';

// ── Presentation — value types & formatters ─────────────────────────────────
export 'presentation/swipe_keys.dart'; // public-api: presentation value/helper API used across feature boundaries
