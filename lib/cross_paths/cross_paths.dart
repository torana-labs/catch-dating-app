/// Cross Paths feature public API.
///
/// Presentation consumers outside this feature must import this barrel instead
/// of reaching into Cross Paths presentation internals.
library;

export 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart'; // public-api: feature-owned callable seam
export 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart'; // public-api: participant-only invitation and event-plan state
export 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart'; // public-api: server-owned companion-seat reservation state
export 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart'; // public-api: sanitized suggestion projection
export 'presentation/cross_paths_event_consent_section.dart'; // public-api: provider-free consent component embedded by Event Detail
export 'presentation/cross_paths_event_consent_state.dart'; // public-api: provider-free consent display state composed by Event Detail
export 'presentation/cross_paths_explore_card.dart'; // public-api: Explore person card and event-tied profile preview
export 'presentation/cross_paths_invitation_controller.dart'; // public-api: invitation lifecycle mutations
export 'presentation/cross_paths_invitation_screen.dart'; // public-api: participant invitation and plan route surface
