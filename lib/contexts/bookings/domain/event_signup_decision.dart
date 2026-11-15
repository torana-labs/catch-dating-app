import 'dart:math' as math;

import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/events/events.dart';

/// The booked and waitlisted counts the signup decision reads, as Functions'
/// `rosterFromEvent` builds them from the public event document.
class EventSignupRoster {
  const EventSignupRoster({
    this.bookedCountsByCohort = const {},
    this.waitlistedCountsByCohort = const {},
    this.totalBooked = 0,
    this.crossPathsPairHeldCount = 0,
    this.crossPathsPairConfirmedCount = 0,
  });

  /// Held Cross Paths seats count as booked in their cohort and in the total.
  factory EventSignupRoster.fromEvent(Event event) {
    final booked = _counts(event.cohortCounts);
    for (final entry in _counts(event.crossPathsPairHeldCohortCounts).entries) {
      booked[entry.key] = (booked[entry.key] ?? 0) + entry.value;
    }
    final held = math.max(0, event.crossPathsPairHeldCount);
    final storedTotal =
        event.bookedCount ??
        _counts(
          event.cohortCounts,
        ).values.fold<int>(0, (total, count) => total + count);
    return EventSignupRoster(
      bookedCountsByCohort: booked,
      waitlistedCountsByCohort: _counts(event.waitlistedCohortCounts),
      totalBooked: storedTotal + held,
      crossPathsPairHeldCount: held,
      crossPathsPairConfirmedCount: math.max(
        0,
        event.crossPathsPairConfirmedCount,
      ),
    );
  }

  factory EventSignupRoster.fromJson(Map<String, Object?> json) =>
      EventSignupRoster(
        bookedCountsByCohort: _counts(json['bookedCountsByCohort']),
        waitlistedCountsByCohort: _counts(json['waitlistedCountsByCohort']),
        totalBooked: (json['totalBooked'] as num?)?.toInt() ?? 0,
        crossPathsPairHeldCount:
            (json['crossPathsPairHeldCount'] as num?)?.toInt() ?? 0,
        crossPathsPairConfirmedCount:
            (json['crossPathsPairConfirmedCount'] as num?)?.toInt() ?? 0,
      );

  final Map<String, int> bookedCountsByCohort;
  final Map<String, int> waitlistedCountsByCohort;
  final int totalBooked;
  final int crossPathsPairHeldCount;
  final int crossPathsPairConfirmedCount;

  int bookedFor(String cohortId) => bookedCountsByCohort[cohortId] ?? 0;

  EventRosterSnapshot get _snapshot => EventRosterSnapshot(
    bookedCountsByCohort: bookedCountsByCohort,
    waitlistedCountsByCohort: waitlistedCountsByCohort,
    crossPathsPairConfirmedCount: crossPathsPairConfirmedCount,
    bookedTotal: totalBooked,
  );
}

Map<String, int> _counts(Object? value) {
  if (value is! Map) return {};
  return {
    for (final entry in value.entries)
      if (entry.key is String && entry.value is num)
        entry.key as String: math.max(0, (entry.value as num).toInt()),
  };
}

/// Whether the policy admits only community members, as Functions'
/// `requiresCommunityMembership` decides it.
bool eventRequiresCommunityMembership(EventPolicyBundle policy) =>
    policy.admissionPolicy.membershipRequired ||
    policy.admissionPolicy.format == EventAdmissionFormat.membersOnly;

/// The list price one cohort pays, as Functions' `quotePriceInPaise` computes
/// it with the requesting guest counted in demand.
int eventSignupQuoteInPaise({
  required EventPolicyBundle policy,
  required String cohortId,
  required EventSignupRoster roster,
}) {
  final pricing = policy.pricingPolicy;
  var amount =
      pricing.basePrice.inPaise +
      (pricing.cohortAdjustments[cohortId]?.inPaise ?? 0);
  for (final rule in pricing.demandPricingRules) {
    amount += rule
        .adjustmentFor(cohortId: cohortId, roster: roster._snapshot)
        .inPaise;
  }
  return math.max(0, amount);
}

/// The first rule that stops one guest booking now, or null when the policy
/// admits them. Mirrors Functions' `signupPolicyDecision` check for check,
/// so the event screen offers what the booking command will accept; the
/// command still decides.
EventViewerRestriction? eventSignupRestriction({
  required EventPolicyBundle policy,
  required String cohortId,
  required EventSignupRoster roster,
  bool hasValidInvite = false,
  bool hasHostApproval = false,
  bool hasActiveCommunityMembership = false,
}) {
  final admission = policy.admissionPolicy;
  if (eventRequiresCommunityMembership(policy) &&
      !hasActiveCommunityMembership) {
    return EventViewerRestriction.membershipRequired;
  }
  if (admission.inviteRequired && !hasValidInvite) {
    return EventViewerRestriction.inviteRequired;
  }
  if (admission.manualApprovalRequired &&
      !hasHostApproval &&
      !(admission.approvedMembersSkipReview && hasActiveCommunityMembership)) {
    return EventViewerRestriction.reviewRequired;
  }
  if (roster.totalBooked >= admission.capacityLimit) {
    return EventViewerRestriction.full;
  }
  final pairs = admission.crossPathsPairInventory;
  if (pairs.isEnabled) {
    final generalOccupied =
        roster.totalBooked -
        roster.crossPathsPairHeldCount -
        roster.crossPathsPairConfirmedCount;
    final generalCapacity = math.max(
      0,
      admission.capacityLimit - pairs.reservedPairCapacity,
    );
    if (generalOccupied >= generalCapacity) {
      return EventViewerRestriction.generalCapacityUnavailable;
    }
  }
  final cohortLimit = admission.cohortCapacityLimits[cohortId];
  if (cohortLimit != null && roster.bookedFor(cohortId) >= cohortLimit) {
    return EventViewerRestriction.cohortCapacityUnavailable;
  }
  final ratio = admission.balancedRatioPolicy;
  if (admission.format != EventAdmissionFormat.balancedRatio || ratio == null) {
    return null;
  }
  if (!ratio.appliesTo(cohortId)) {
    return ratio.outOfRatioCohortPolicy ==
            EventOutOfRatioCohortPolicy.admitWithinGeneralCapacity
        ? null
        : EventViewerRestriction.outOfRatioReviewRequired;
  }
  final current = roster.bookedFor(cohortId);
  final counterpart = roster.bookedFor(ratio.counterpartFor(cohortId)!);
  if (counterpart == 0 && current < ratio.openingBufferPerCohort) return null;
  if (current + 1 <= counterpart + ratio.maxSkew) return null;
  return EventViewerRestriction.balanceUnavailable;
}
