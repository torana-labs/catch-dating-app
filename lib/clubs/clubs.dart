// ignore_for_file: directives_ordering

/// Catch Clubs feature — public API barrel.
///
/// Re-exports the primary domain types, repositories, screens, and key
/// presentation artifacts consumers outside `lib/clubs/` rely on.
///
/// Prefer importing this barrel from outside the feature. Code within
/// `lib/clubs/` should import specific files to keep dependency edges
/// explicit.
library;

// ── Domain models ───────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/domain/club.dart';
export 'package:catch_dating_app/contexts/organizers/domain/club_draft.dart';
export 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
export 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
export 'package:catch_dating_app/contexts/organizers/domain/club_membership_extensions.dart';
export 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';

// ── Data ────────────────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/club_callable_responses.dart';
export 'package:catch_dating_app/contexts/organizers/data/club_draft_repository.dart';
export 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
export 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';

// ── Presentation — screens ──────────────────────────────────────────────────
export 'presentation/detail/club_detail_read_only_preview.dart'; // public-api: provider-backed read-only club detail composition for owner previews
export 'presentation/detail/club_detail_screen.dart'; // public-api: route entry point exposed to app routing

// ── Presentation — view models & controllers ────────────────────────────────
export 'presentation/detail/club_detail_view_model.dart'; // public-api: read-model seam for route composition
export 'presentation/detail/club_host_contact_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/detail/club_membership_controller.dart'; // public-api: command seam for route-owned actions

// ── Presentation — widgets commonly reused outside the feature ──────────────
export 'presentation/detail/widgets/club_detail_body.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/detail/widgets/club_detail_dock.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/detail/widgets/club_hero_top_bar.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/detail/widgets/club_schedule_section.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/detail/widgets/club_share_card.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/discovery/widgets/club_avatar_rail.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/discovery/widgets/club_discover_list.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/discovery/widgets/club_list_tile.dart'; // public-api: shared presentation component used outside this feature
export 'shared/club_host_identity_row.dart';
export 'shared/club_placeholder_cover.dart';
export 'shared/club_transition_tags.dart';

// ── Presentation — value types & formatters ─────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/club_name_lookup.dart';
export 'shared/club_action_keys.dart';
