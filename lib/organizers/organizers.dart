// ignore_for_file: directives_ordering

/// Organizers feature: public API barrel.
///
/// Re-exports the organizer domain types, repositories, screens and the
/// presentation pieces consumers outside the feature rely on.
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
export 'package:catch_dating_app/clubs/presentation/detail/club_detail_read_only_preview.dart'; // public-api: provider-backed read-only club detail composition for owner previews
export 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen.dart'; // public-api: route entry point exposed to app routing

// ── Presentation — view models & controllers ────────────────────────────────
export 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart'; // public-api: read-model seam for route composition
export 'package:catch_dating_app/clubs/presentation/detail/club_host_contact_controller.dart'; // public-api: command seam for route-owned actions
export 'package:catch_dating_app/clubs/presentation/detail/club_membership_controller.dart'; // public-api: command seam for route-owned actions

// ── Presentation — widgets commonly reused outside the feature ──────────────
export 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_body.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_dock.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/detail/widgets/club_hero_top_bar.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/detail/widgets/club_schedule_section.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/detail/widgets/club_share_card.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/discovery/widgets/club_avatar_rail.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/discovery/widgets/club_discover_list.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/presentation/discovery/widgets/club_list_tile.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/clubs/shared/club_host_identity_row.dart';
export 'package:catch_dating_app/clubs/shared/club_placeholder_cover.dart';
export 'package:catch_dating_app/clubs/shared/club_transition_tags.dart';

// ── Presentation — value types & formatters ─────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/club_name_lookup.dart';
export 'package:catch_dating_app/clubs/shared/club_action_keys.dart';

// ── Presentation — trust ────────────────────────────────────────────────────
export 'presentation/organizer_authority_badge.dart'; // public-api: organizer trust presentation used across discovery and detail surfaces
