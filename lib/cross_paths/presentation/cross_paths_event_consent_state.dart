import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';

final class CrossPathsEventConsentSectionState {
  const CrossPathsEventConsentSectionState({
    required this.visible,
    required this.enabled,
    required this.loaded,
    required this.pending,
    required this.unavailable,
  });

  const CrossPathsEventConsentSectionState.hidden()
    : visible = false,
      enabled = false,
      loaded = false,
      pending = false,
      unavailable = false;

  final bool visible;
  final bool enabled;
  final bool loaded;
  final bool pending;
  final bool unavailable;

  bool get canChange => visible && loaded && !pending && !unavailable;
}

bool crossPathsEventConsentEligible({
  required Event event,
  required EventParticipation? participation,
  required UserProfile? userProfile,
  required DateTime now,
}) =>
    event.crossPathsDiscoveryEnabled &&
    userProfile?.prefsShowInCrossPaths == true &&
    participation?.status == EventParticipationStatus.signedUp &&
    event.startTime.isAfter(now) &&
    !event.isCancelled;

CrossPathsEventConsentSectionState crossPathsEventConsentSectionStateFrom({
  required bool eligibleToEnable,
  required bool loaded,
  required bool enabled,
  required bool pending,
  required bool unavailable,
}) {
  // Keep an existing affirmative choice visible after booking/global
  // eligibility disappears so the member can still revoke it. A member who
  // is not eligible and has no enabled edge never sees an enable control.
  if (!eligibleToEnable && !enabled) {
    return const CrossPathsEventConsentSectionState.hidden();
  }
  return CrossPathsEventConsentSectionState(
    visible: true,
    enabled: enabled,
    loaded: loaded,
    pending: pending,
    unavailable: unavailable,
  );
}
