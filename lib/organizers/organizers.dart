// ignore_for_file: directives_ordering

/// Organizers feature: public API barrel.
///
/// Re-exports the organizer domain types, repositories, screens and the
/// presentation pieces consumers outside the feature rely on.
library;

// ── Domain models ───────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
export 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
export 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
export 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
export 'package:catch_dating_app/contexts/organizers/domain/organizer_membership_extensions.dart';
export 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';

// ── Data ────────────────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/organizer_callable_responses.dart';
export 'package:catch_dating_app/contexts/organizers/data/organizer_draft_repository.dart';
export 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
export 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';

// ── Presentation — screens ──────────────────────────────────────────────────
export 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_read_only_preview.dart'; // public-api: provider-backed read-only club detail composition for owner previews
export 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart'; // public-api: route entry point exposed to app routing

// ── Presentation — view models & controllers ────────────────────────────────
export 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart'; // public-api: read-model seam for route composition
export 'package:catch_dating_app/organizers/presentation/detail/organizer_host_contact_controller.dart'; // public-api: command seam for route-owned actions
export 'package:catch_dating_app/organizers/presentation/detail/organizer_membership_controller.dart'; // public-api: command seam for route-owned actions

// ── Presentation — widgets commonly reused outside the feature ──────────────
export 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_hero_top_bar.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_schedule_section.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_share_card.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_avatar_rail.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_discover_list.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/shared/organizer_host_identity_row.dart';
export 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
export 'package:catch_dating_app/organizers/shared/organizer_transition_tags.dart';

// ── Presentation — value types & formatters ─────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
export 'package:catch_dating_app/organizers/shared/organizer_action_keys.dart';

// ── Presentation — trust ────────────────────────────────────────────────────
export 'presentation/organizer_authority_badge.dart'; // public-api: organizer trust presentation used across discovery and detail surfaces
