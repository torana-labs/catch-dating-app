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
export 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
export 'package:catch_dating_app/contexts/organizers/domain/organizer_follow_extensions.dart';
export 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';

// ── Data ────────────────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/organizer_callable_responses.dart';
export 'package:catch_dating_app/contexts/organizers/data/organizer_draft_repository.dart';
export 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
export 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';

// ── Presentation — screens ──────────────────────────────────────────────────
export 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_read_only_preview.dart'; // public-api: provider-backed read-only club detail composition for owner previews

// ── Presentation — view models & controllers ────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/actions/organizer_follow_controller.dart'; // public-api: command seam for route-owned actions

// ── Presentation — widgets commonly reused outside the feature ──────────────
export 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_avatar_rail.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_discover_list.dart'; // public-api: shared presentation component used outside this feature
export 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart'; // public-api: shared presentation component used outside this feature

// ── Presentation — value types & formatters ─────────────────────────────────
export 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';

// ── Presentation — trust ────────────────────────────────────────────────────
