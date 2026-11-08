part of '../event_success_activity_profile.dart';

/// When a guest-facing cue (a live prompt, a step-change nudge or a pushed
/// moment) would reach a guest's phone.
enum EventSuccessGuestCueTiming {
  /// Check-in and the first hello, as the guest arrives.
  arrival,

  /// The host moves the run of show to a new step: a new round, course or
  /// stop.
  stepChange,

  /// Anything between step changes, such as a host-initiated cue to one
  /// table.
  midStep,

  /// After the finish.
  postEvent,
}

/// Phone availability is the switch that decides whether a guest cue may
/// interrupt the guest. It never blocks something the guest opens themselves,
/// such as self check-in.
extension EventSuccessPhoneAvailabilityPolicy on EventSuccessPhoneAvailability {
  /// Whether guests keep their phones away while the core activity runs.
  bool get guestPhoneAwayDuringActivity => switch (this) {
    EventSuccessPhoneAvailability.arrivalAndPostEventOnly ||
    EventSuccessPhoneAvailability.hostOnlyLive ||
    EventSuccessPhoneAvailability.noneDuringActivity => true,
    EventSuccessPhoneAvailability.continuous ||
    EventSuccessPhoneAvailability.plannedPauses => false,
  };

  /// Whether a guest cue with [timing] may reach the guest's phone.
  ///
  /// [activityUnderway] is true while the core activity runs: the active run
  /// of show step is an activity step, or the event is between its start and
  /// end when no step is known. A planned stop is a step that is not an
  /// activity step.
  bool allowsGuestCue(
    EventSuccessGuestCueTiming timing, {
    required bool activityUnderway,
  }) {
    switch (this) {
      case EventSuccessPhoneAvailability.continuous:
        return true;
      case EventSuccessPhoneAvailability.plannedPauses:
        return timing != EventSuccessGuestCueTiming.midStep;
      case EventSuccessPhoneAvailability.arrivalAndPostEventOnly ||
          EventSuccessPhoneAvailability.hostOnlyLive ||
          EventSuccessPhoneAvailability.noneDuringActivity:
        if (timing == EventSuccessGuestCueTiming.postEvent) return true;
        if (timing == EventSuccessGuestCueTiming.midStep) return false;
        return !activityUnderway;
    }
  }
}

/// Whether [step] is part of the core activity rather than a planned pause,
/// stop, arrival or wrap.
bool eventSuccessStepIsActivity(EventRunOfShowStep? step) =>
    step?.stage == EventSuccessStage.activity;

/// The setup explanation of when a guest-facing module can use phones.
String eventSuccessPhoneAvailabilityNote(
  EventSuccessPhoneAvailability phoneAvailability,
  EventSuccessDurationShape durationShape,
) {
  return switch (phoneAvailability) {
    EventSuccessPhoneAvailability.continuous =>
      'Phones: allowed at any time, but nothing needs them after check-in. The host can send a cue whenever it helps.',
    EventSuccessPhoneAvailability.plannedPauses => switch (durationShape) {
      EventSuccessDurationShape.stops =>
        'Phones: only between stops, so this appears when the group moves on.',
      EventSuccessDurationShape.courses =>
        'Phones: only between courses, so this appears at a course change.',
      EventSuccessDurationShape.continuous ||
      EventSuccessDurationShape.rounds ||
      EventSuccessDurationShape.segments =>
        'Phones: only between rounds or at step changes, so this appears then.',
    },
    EventSuccessPhoneAvailability.arrivalAndPostEventOnly ||
    EventSuccessPhoneAvailability.noneDuringActivity =>
      'Phones: away while the activity runs. This appears only at check-in, at planned stops and after the finish.',
    EventSuccessPhoneAvailability.hostOnlyLive =>
      'Phones: only the host uses one during the activity. Guests see this at check-in, at planned stops and after the finish.',
  };
}

/// Modules whose content lands on guest phones during the event.
final _guestPhoneModuleIds = <String>{
  EventSuccessModuleCatalog.firstHelloCheckIn.id,
  EventSuccessModuleCatalog.socialMissions.id,
  EventSuccessModuleCatalog.guidedRotations.id,
  EventSuccessModuleCatalog.liveReveal.id,
  EventSuccessModuleCatalog.wingmanRequests.id,
};
