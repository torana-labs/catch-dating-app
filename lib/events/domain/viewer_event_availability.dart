import 'package:catch_dating_app/event_policies/domain/event_policy.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_domain_readiness.dart';
import 'package:catch_dating_app/events/domain/event_eligibility.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/events/domain/event_profile_requirements.dart';
import 'package:catch_dating_app/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/user_profile/domain/profile_readiness.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';

enum ViewerEventAvailabilityStatus {
  open,
  saved,
  hosted,
  joined,
  waitlisted,
  attended,
  approvedToBook,
  requestRequired,
  waitlistAvailable,
  full,
  fullForViewer,
  inviteRequired,
  membershipRequired,
  runPreferencesRequired,
  profileRequired,
  ageRestricted,
  past,
  cancelled,
}

class ViewerEventAvailability {
  const ViewerEventAvailability({
    required this.status,
    required this.spotsRemaining,
    required this.isSaved,
    required this.isHosted,
    required this.isClubMember,
    this.eligibility,
    this.admissionDecision,
    this.quotedPriceInPaise,
    this.cohortId,
    this.cohortLabel,
    this.ageLimit,
  });

  final ViewerEventAvailabilityStatus status;
  final EventEligibility? eligibility;
  final EventAdmissionDecision? admissionDecision;
  final int spotsRemaining;
  final bool isSaved;
  final bool isHosted;
  final bool isClubMember;
  final int? quotedPriceInPaise;
  final String? cohortId;
  final String? cohortLabel;
  final int? ageLimit;

  bool get canBookNow =>
      status == ViewerEventAvailabilityStatus.open ||
      status == ViewerEventAvailabilityStatus.saved ||
      status == ViewerEventAvailabilityStatus.approvedToBook;

  bool get canJoinWaitlist =>
      status == ViewerEventAvailabilityStatus.waitlistAvailable;

  bool get isBlocked =>
      status == ViewerEventAvailabilityStatus.full ||
      status == ViewerEventAvailabilityStatus.fullForViewer ||
      status == ViewerEventAvailabilityStatus.inviteRequired ||
      status == ViewerEventAvailabilityStatus.membershipRequired ||
      status == ViewerEventAvailabilityStatus.runPreferencesRequired ||
      status == ViewerEventAvailabilityStatus.profileRequired ||
      status == ViewerEventAvailabilityStatus.ageRestricted ||
      status == ViewerEventAvailabilityStatus.past ||
      status == ViewerEventAvailabilityStatus.cancelled;
}

ViewerEventAvailability resolveViewerEventAvailability({
  required Event event,
  required UserProfile? userProfile,
  EventParticipation? participation,
  bool isSaved = false,
  bool isHosted = false,
  bool isClubMember = false,
  required DateTime now,
  bool hasValidInvite = false,
}) {
  final referenceNow = now;
  final base = _ViewerEventAvailabilityBuilder(
    event: event,
    userProfile: userProfile,
    isSaved: isSaved,
    isHosted: isHosted,
    isClubMember: isClubMember,
  );

  if (event.isCancelled) {
    return base.build(ViewerEventAvailabilityStatus.cancelled);
  }

  switch (participation?.status) {
    case EventParticipationStatus.attended:
      return base.build(
        _hasEventStarted(event, referenceNow)
            ? ViewerEventAvailabilityStatus.attended
            : ViewerEventAvailabilityStatus.joined,
      );
    case EventParticipationStatus.signedUp:
      return base.build(ViewerEventAvailabilityStatus.joined);
    case EventParticipationStatus.waitlisted:
      if (participation != null &&
          ParticipationStatusSnapshot.of(
            participation,
            now: referenceNow,
          ).hasHostApproval) {
        return base.build(
          _hasEventStarted(event, referenceNow)
              ? ViewerEventAvailabilityStatus.past
              : ViewerEventAvailabilityStatus.approvedToBook,
          eligibility: _hasEventStarted(event, referenceNow)
              ? const EventPast()
              : const Eligible(),
        );
      }
      return base.build(
        ViewerEventAvailabilityStatus.waitlisted,
        eligibility: const OnWaitlist(),
      );
    case EventParticipationStatus.cancelled:
    case EventParticipationStatus.deleted:
    case null:
      break;
  }

  if (!event.isUpcomingAt(referenceNow)) {
    return base.build(
      ViewerEventAvailabilityStatus.past,
      eligibility: const EventPast(),
    );
  }

  if (isHosted) {
    return base.build(ViewerEventAvailabilityStatus.hosted);
  }

  if (userProfile == null) {
    return base.build(
      event.isFull
          ? ViewerEventAvailabilityStatus.full
          : isSaved
          ? ViewerEventAvailabilityStatus.saved
          : ViewerEventAvailabilityStatus.open,
    );
  }

  if (!event.hasRequiredProfileDetails(userProfile, referenceNow)) {
    return base.build(
      ViewerEventAvailabilityStatus.profileRequired,
      eligibility: const ProfileDetailsRequired(),
    );
  }
  final userAge = userProfile.ageOn(referenceNow);
  if (event.requiresAgeDetails &&
      userAge != null &&
      userAge < event.constraints.minAge) {
    return base.build(
      ViewerEventAvailabilityStatus.ageRestricted,
      eligibility: AgeTooYoung(event.constraints.minAge),
      ageLimit: event.constraints.minAge,
    );
  }
  if (event.requiresAgeDetails &&
      userAge != null &&
      userAge > event.constraints.maxAge) {
    return base.build(
      ViewerEventAvailabilityStatus.ageRestricted,
      eligibility: AgeTooOld(event.constraints.maxAge),
      ageLimit: event.constraints.maxAge,
    );
  }

  final policy = event.effectiveEventPolicy;
  final attendee = EventAttendeeProfile.fromUserProfile(userProfile);
  final decision = const EventPolicyEngine().decideAdmission(
    policy: policy,
    request: EventAdmissionRequest(
      attendee: attendee,
      hasValidInvite: hasValidInvite,
      isClubMember: isClubMember,
    ),
    roster: EventRosterSnapshot(
      bookedCountsByCohort: event.effectiveCohortCounts,
      waitlistedCountsByCohort: event.effectiveWaitlistedCohortCounts,
      crossPathsPairConfirmedCount: event.crossPathsPairConfirmedCount,
    ),
  );
  final quotedPriceInPaise = decision.priceQuote.finalAmount.inPaise;
  final needsRunPreferences =
      event.requiresRunPreferences && !userProfile.hasCurrentRunPreferences;

  switch (decision.type) {
    case EventAdmissionDecisionType.admitted:
      if (needsRunPreferences) {
        return base.build(
          ViewerEventAvailabilityStatus.runPreferencesRequired,
          eligibility: const Eligible(),
          admissionDecision: decision,
          quotedPriceInPaise: quotedPriceInPaise,
        );
      }
      return base.build(
        isSaved
            ? ViewerEventAvailabilityStatus.saved
            : ViewerEventAvailabilityStatus.open,
        eligibility: const Eligible(),
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
    case EventAdmissionDecisionType.waitlisted:
      return base.build(
        ViewerEventAvailabilityStatus.waitlistAvailable,
        eligibility: const EventFull(),
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
    case EventAdmissionDecisionType.manualReviewRequired:
      // A manual-review event still needs the same current run-preference
      // context as an immediately admitted event. Collect that prerequisite
      // before opening the approval request so the host never receives an
      // incomplete request.
      if (needsRunPreferences) {
        return base.build(
          ViewerEventAvailabilityStatus.runPreferencesRequired,
          eligibility: const Eligible(),
          admissionDecision: decision,
          quotedPriceInPaise: quotedPriceInPaise,
        );
      }
      return base.build(
        ViewerEventAvailabilityStatus.requestRequired,
        eligibility: const GenderCapacityReached(),
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
    case EventAdmissionDecisionType.inviteRequired:
      return base.build(
        ViewerEventAvailabilityStatus.inviteRequired,
        eligibility: const EventInviteRequired(),
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
    case EventAdmissionDecisionType.membershipRequired:
      return base.build(
        ViewerEventAvailabilityStatus.membershipRequired,
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
    case EventAdmissionDecisionType.soldOut:
      return base.build(
        ViewerEventAvailabilityStatus.full,
        eligibility: const EventFull(),
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
    case EventAdmissionDecisionType.cohortUnavailable:
      return base.build(
        ViewerEventAvailabilityStatus.fullForViewer,
        eligibility: const GenderCapacityReached(),
        admissionDecision: decision,
        quotedPriceInPaise: quotedPriceInPaise,
      );
  }
}

/// Maps canonical observed facts into existing presentation labels. This does
/// not run admission policy or treat follows/review as a membership grant.
ViewerEventAvailability viewerEventAvailabilityFromState({
  required EventViewerState viewer,
  required Event event,
  required UserProfile? userProfile,
  required DateTime now,
  bool isSaved = false,
}) {
  final status = viewer.hasAdmission
      ? viewer.attendance == EventViewerAttendance.attended &&
                !event.startTime.isAfter(now)
            ? ViewerEventAvailabilityStatus.attended
            : ViewerEventAvailabilityStatus.joined
      : viewer.allowed
      ? viewer.review == EventViewerReview.approved
            ? ViewerEventAvailabilityStatus.approvedToBook
            : isSaved
            ? ViewerEventAvailabilityStatus.saved
            : ViewerEventAvailabilityStatus.open
      : switch (viewer.restriction!) {
          EventViewerRestriction.bookingDetailsRequired =>
            ViewerEventAvailabilityStatus.profileRequired,
          EventViewerRestriction.membershipRequired ||
          EventViewerRestriction.paidMembershipRequired ||
          EventViewerRestriction.memberEarlyAccess =>
            ViewerEventAvailabilityStatus.membershipRequired,
          EventViewerRestriction.inviteRequired =>
            ViewerEventAvailabilityStatus.inviteRequired,
          EventViewerRestriction.reviewRequired ||
          EventViewerRestriction.outOfRatioReviewRequired =>
            viewer.waitlisted
                ? ViewerEventAvailabilityStatus.waitlisted
                : ViewerEventAvailabilityStatus.requestRequired,
          EventViewerRestriction.full ||
          EventViewerRestriction.generalCapacityUnavailable ||
          EventViewerRestriction.pairCapacityUnavailable =>
            viewer.waitlisted
                ? ViewerEventAvailabilityStatus.waitlisted
                : ViewerEventAvailabilityStatus.full,
          EventViewerRestriction.cohortCapacityUnavailable ||
          EventViewerRestriction.balanceUnavailable =>
            viewer.waitlisted
                ? ViewerEventAvailabilityStatus.waitlisted
                : event
                      .effectiveEventPolicy
                      .admissionPolicy
                      .waitlistPolicy
                      .isEnabled
                ? ViewerEventAvailabilityStatus.waitlistAvailable
                : ViewerEventAvailabilityStatus.fullForViewer,
          EventViewerRestriction.runPreferencesRequired =>
            ViewerEventAvailabilityStatus.runPreferencesRequired,
          EventViewerRestriction.past => ViewerEventAvailabilityStatus.past,
          EventViewerRestriction.cancelled =>
            ViewerEventAvailabilityStatus.cancelled,
          _ => ViewerEventAvailabilityStatus.ageRestricted,
        };
  final eligibility = switch (status) {
    ViewerEventAvailabilityStatus.joined => const AlreadySignedUp(),
    ViewerEventAvailabilityStatus.attended => const Attended(),
    ViewerEventAvailabilityStatus.waitlisted => const OnWaitlist(),
    ViewerEventAvailabilityStatus.full ||
    ViewerEventAvailabilityStatus.waitlistAvailable => const EventFull(),
    ViewerEventAvailabilityStatus.inviteRequired => const EventInviteRequired(),
    ViewerEventAvailabilityStatus.fullForViewer =>
      const GenderCapacityReached(),
    ViewerEventAvailabilityStatus.ageRestricted =>
      userProfile?.ageOn(now) == null
          ? null
          : userProfile!.ageOn(now)! < event.constraints.minAge
          ? AgeTooYoung(event.constraints.minAge)
          : userProfile.ageOn(now)! > event.constraints.maxAge
          ? AgeTooOld(event.constraints.maxAge)
          : null,
    ViewerEventAvailabilityStatus.open ||
    ViewerEventAvailabilityStatus.saved ||
    ViewerEventAvailabilityStatus.approvedToBook ||
    ViewerEventAvailabilityStatus.runPreferencesRequired => const Eligible(),
    _ => null,
  };
  return ViewerEventAvailability(
    status: status,
    eligibility: eligibility,
    spotsRemaining: event.spotsRemaining,
    isSaved: isSaved,
    isHosted: false,
    isClubMember: viewer.membership == EventViewerMembership.active,
    quotedPriceInPaise: viewer.quotedPriceInPaise,
  );
}

bool _hasEventStarted(Event event, DateTime now) =>
    !event.startTime.isAfter(now);

class _ViewerEventAvailabilityBuilder {
  const _ViewerEventAvailabilityBuilder({
    required this.event,
    required this.userProfile,
    required this.isSaved,
    required this.isHosted,
    required this.isClubMember,
  });

  final Event event;
  final UserProfile? userProfile;
  final bool isSaved;
  final bool isHosted;
  final bool isClubMember;

  ViewerEventAvailability build(
    ViewerEventAvailabilityStatus status, {
    EventEligibility? eligibility,
    EventAdmissionDecision? admissionDecision,
    int? quotedPriceInPaise,
    int? ageLimit,
  }) {
    final decision = admissionDecision;
    return ViewerEventAvailability(
      status: status,
      eligibility: eligibility,
      admissionDecision: decision,
      spotsRemaining: event.spotsRemaining,
      isSaved: isSaved,
      isHosted: isHosted,
      isClubMember: isClubMember,
      quotedPriceInPaise:
          quotedPriceInPaise ??
          (userProfile == null
              ? event.priceInPaise
              : event.priceInPaiseFor(userProfile!)),
      cohortId: decision?.cohort.id,
      cohortLabel: decision?.cohort.label,
      ageLimit: ageLimit,
    );
  }
}
