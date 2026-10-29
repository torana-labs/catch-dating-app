// ignore_for_file: directives_ordering

/// Catch Events feature — public API barrel.
///
/// Re-exports the primary domain types, repositories, screens, and key
/// presentation artifacts consumers outside `lib/events/` rely on.
///
/// Prefer importing this barrel from outside the feature. Code within
/// `lib/events/` should import specific files to keep dependency edges
/// explicit.
library;

// ── Domain models ───────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/events/domain/event.dart';
export 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
export 'package:catch_dating_app/contexts/events/domain/event_domain_readiness.dart';
export 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
export 'package:catch_dating_app/contexts/events/domain/event_eligibility.dart';
export 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
export 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
export 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
export 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
export 'package:catch_dating_app/contexts/events/domain/external_event.dart';

// ── Repositories ────────────────────────────────────────────────────────────
export 'package:catch_dating_app/contexts/events/data/event_callable_adapters.dart';
export 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
export 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
export 'package:catch_dating_app/contexts/events/data/event_repository.dart';
export 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';

// ── Presentation — screens ──────────────────────────────────────────────────
export 'presentation/event_detail_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/event_location_map_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/event_map_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/location_picker_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/saved_events_screen.dart'; // public-api: route entry point exposed to app routing
export 'shared/event_check_in_celebration_screen.dart';
export 'shared/event_joined_celebration_screen.dart';

// ── Presentation — view models & controllers ────────────────────────────────
export 'presentation/event_booking_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/event_detail_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/event_detail_view_model.dart'; // public-api: read-model seam for route composition
export 'presentation/event_map_view_model.dart'; // public-api: read-model seam for route composition
export 'shared/attendance_sheet_view_model.dart';
export 'shared/event_invite_share_copy.dart';

// ── Presentation — widgets commonly reused outside the feature ──────────────
export 'package:catch_dating_app/core/widgets/event_activity_badge.dart';
export 'presentation/widgets/event_detail_body.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_detail_dock.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_detail_hero_top_bar.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_detail_overview_section.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_detail_social_section.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_hype_avatar_row.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_photo_header.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/event_pins_map.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/who_is_going_section.dart'; // public-api: shared presentation component used outside this feature
export 'shared/event_share_card.dart';
export 'shared/event_tiles/event_tile_data.dart';
export 'shared/event_tiles/event_tiles.dart';

// ── Presentation — value types & formatters ─────────────────────────────────
export 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
export 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
export 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
export 'package:catch_dating_app/contexts/events/domain/event_location_links.dart';
export 'presentation/event_action_keys.dart'; // public-api: presentation value/helper API used across feature boundaries
export 'presentation/event_map_center.dart'; // public-api: presentation value/helper API used across feature boundaries
export 'shared/event_detail_route_transition.dart';
