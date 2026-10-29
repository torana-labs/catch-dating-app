part of '../event_policy.dart';

class EventAdmissionRequest {
  const EventAdmissionRequest({
    required this.attendee,
    this.hasValidInvite = false,
    this.isClubMember = false,
  });

  final EventAttendeeProfile attendee;
  final bool hasValidInvite;
  final bool isClubMember;
}

class EventAdmissionDecision {
  const EventAdmissionDecision({
    required this.type,
    required this.reason,
    required this.cohort,
    required this.priceQuote,
    required this.waitlistMode,
  });

  final EventAdmissionDecisionType type;
  final EventAdmissionDecisionReason reason;
  final EventCohort cohort;
  final EventPriceQuote priceQuote;
  final EventWaitlistMode waitlistMode;

  bool get isBookable => type == EventAdmissionDecisionType.admitted;
  bool get isWaitlisted => type == EventAdmissionDecisionType.waitlisted;
}

class EventPolicyEngine {
  const EventPolicyEngine();

  EventAdmissionDecision decideAdmission({
    required EventPolicyBundle policy,
    required EventAdmissionRequest request,
    required EventRosterSnapshot roster,
  }) {
    final cohort = policy.cohortResolver.resolve(request.attendee);
    final priceQuote = policy.pricingPolicy.quoteFor(
      cohort: cohort,
      roster: roster,
    );
    final admissionPolicy = policy.admissionPolicy;

    EventAdmissionDecision decision({
      required EventAdmissionDecisionType type,
      required EventAdmissionDecisionReason reason,
    }) {
      return EventAdmissionDecision(
        type: type,
        reason: reason,
        cohort: cohort,
        priceQuote: priceQuote,
        waitlistMode: admissionPolicy.waitlistPolicy.mode,
      );
    }

    if (admissionPolicy.inviteRequired && !request.hasValidInvite) {
      return decision(
        type: EventAdmissionDecisionType.inviteRequired,
        reason: EventAdmissionDecisionReason.inviteRequired,
      );
    }

    if (admissionPolicy.membershipRequired && !request.isClubMember) {
      return decision(
        type: EventAdmissionDecisionType.membershipRequired,
        reason: EventAdmissionDecisionReason.membershipRequired,
      );
    }

    final pairInventory = admissionPolicy.crossPathsPairInventory;
    final generalCapacity = pairInventory.isEnabled
        ? admissionPolicy.capacityLimit - pairInventory.reservedPairCapacity
        : admissionPolicy.capacityLimit;
    final generalBooked = math.max(
      0,
      roster.totalBooked - roster.crossPathsPairConfirmedCount,
    );
    if (generalBooked >= generalCapacity) {
      return _capacityBlockedDecision(decision, admissionPolicy);
    }

    final cohortLimit = admissionPolicy.cohortCapacityLimits[cohort.id];
    if (cohortLimit != null &&
        roster.bookedCountFor(cohort.id) >= cohortLimit) {
      return _cohortBlockedDecision(
        decision,
        admissionPolicy,
        EventAdmissionDecisionReason.cohortCapReached,
      );
    }

    final balancedRatioPolicy = admissionPolicy.balancedRatioPolicy;
    if (balancedRatioPolicy != null) {
      if (!balancedRatioPolicy.appliesTo(cohort.id)) {
        return switch (balancedRatioPolicy.outOfRatioCohortPolicy) {
          EventOutOfRatioCohortPolicy.admitWithinGeneralCapacity =>
            _maybeManualReview(decision, admissionPolicy, request),
          EventOutOfRatioCohortPolicy.waitlist => _cohortBlockedDecision(
            decision,
            admissionPolicy,
            EventAdmissionDecisionReason.outOfRatioCohortWaitlisted,
          ),
          EventOutOfRatioCohortPolicy.manualReview => decision(
            type: EventAdmissionDecisionType.manualReviewRequired,
            reason: EventAdmissionDecisionReason.outOfRatioCohortRequiresReview,
          ),
          EventOutOfRatioCohortPolicy.reject => decision(
            type: EventAdmissionDecisionType.cohortUnavailable,
            reason: EventAdmissionDecisionReason.outOfRatioCohortRejected,
          ),
        };
      }

      if (!balancedRatioPolicy.allowsAdmission(
        cohortId: cohort.id,
        roster: roster,
      )) {
        return _cohortBlockedDecision(
          decision,
          admissionPolicy,
          EventAdmissionDecisionReason.balancedRatioLimitReached,
        );
      }
    }

    return _maybeManualReview(decision, admissionPolicy, request);
  }

  EventAdmissionDecision _maybeManualReview(
    EventAdmissionDecision Function({
      required EventAdmissionDecisionType type,
      required EventAdmissionDecisionReason reason,
    })
    decision,
    EventAdmissionPolicy admissionPolicy,
    EventAdmissionRequest request,
  ) {
    if (admissionPolicy.manualApprovalRequired &&
        !(admissionPolicy.approvedMembersSkipReview && request.isClubMember)) {
      return decision(
        type: EventAdmissionDecisionType.manualReviewRequired,
        reason: EventAdmissionDecisionReason.manualApprovalRequired,
      );
    }
    return decision(
      type: EventAdmissionDecisionType.admitted,
      reason: EventAdmissionDecisionReason.capacityAvailable,
    );
  }

  EventAdmissionDecision _capacityBlockedDecision(
    EventAdmissionDecision Function({
      required EventAdmissionDecisionType type,
      required EventAdmissionDecisionReason reason,
    })
    decision,
    EventAdmissionPolicy admissionPolicy,
  ) {
    if (admissionPolicy.waitlistPolicy.isEnabled) {
      return decision(
        type: EventAdmissionDecisionType.waitlisted,
        reason: EventAdmissionDecisionReason.capacityFull,
      );
    }
    return decision(
      type: EventAdmissionDecisionType.soldOut,
      reason: EventAdmissionDecisionReason.capacityFull,
    );
  }

  EventAdmissionDecision _cohortBlockedDecision(
    EventAdmissionDecision Function({
      required EventAdmissionDecisionType type,
      required EventAdmissionDecisionReason reason,
    })
    decision,
    EventAdmissionPolicy admissionPolicy,
    EventAdmissionDecisionReason reason,
  ) {
    if (admissionPolicy.waitlistPolicy.isEnabled) {
      return decision(
        type: EventAdmissionDecisionType.waitlisted,
        reason: reason,
      );
    }
    return decision(
      type: EventAdmissionDecisionType.cohortUnavailable,
      reason: reason,
    );
  }
}
