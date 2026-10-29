import 'package:catch_dating_app/event_policies/domain/event_policy.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_eligibility.dart';
import 'package:catch_dating_app/events/domain/event_profile_requirements.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';

/// Pure Dart service class for Event domain business logic.
///
/// Keeps service-level logic out of the data model so [Event] remains focused
/// on shape and serialization. Participation rules live with
/// `ParticipationStatusSnapshot` in the bookings model.
class EventService {
  EventService._();

  /// Returns fresh-viewer eligibility of [user] for [event].
  ///
  /// User-specific roster state lives in `eventParticipations`, so callers that
  /// know the viewer's participation edge should prefer a view-model seam that
  /// combines the event and participation before rendering action state.
  static EventEligibility eligibilityFor(
    Event event,
    UserProfile user, {
    required DateTime now,
    bool hasValidInvite = false,
  }) {
    if (!event.isUpcomingAt(now)) return const EventPast();
    if (!event.hasRequiredProfileDetails(user, now)) {
      return const ProfileDetailsRequired();
    }
    final userAge = user.ageOn(now);
    if (event.requiresAgeDetails &&
        userAge != null &&
        userAge < event.constraints.minAge) {
      return AgeTooYoung(event.constraints.minAge);
    }
    if (event.requiresAgeDetails &&
        userAge != null &&
        userAge > event.constraints.maxAge) {
      return AgeTooOld(event.constraints.maxAge);
    }

    final policy = event.effectiveEventPolicy;
    final decision = const EventPolicyEngine().decideAdmission(
      policy: policy,
      request: EventAdmissionRequest(
        attendee: EventAttendeeProfile.fromUserProfile(user),
        hasValidInvite: hasValidInvite,
      ),
      roster: EventRosterSnapshot(
        bookedCountsByCohort: event.effectiveCohortCounts,
        crossPathsPairConfirmedCount: event.crossPathsPairConfirmedCount,
      ),
    );

    if (decision.isBookable) return const Eligible();
    if (decision.isWaitlisted) return const EventFull();
    if (decision.reason == EventAdmissionDecisionReason.cohortCapReached ||
        decision.reason ==
            EventAdmissionDecisionReason.balancedRatioLimitReached) {
      return const GenderCapacityReached();
    }
    if (decision.reason == EventAdmissionDecisionReason.capacityFull) {
      return const EventFull();
    }
    if (decision.reason == EventAdmissionDecisionReason.inviteRequired) {
      return const EventInviteRequired();
    }
    return const GenderCapacityReached();
  }
}
