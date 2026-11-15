import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_signup_decision.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_entitlement.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_event_facts.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';

/// A guest's community membership with one organizer, as the server projects
/// it into `guestBookingFacts/{uid}`.
enum GuestCommunityMembershipState { active, revoked }

/// Everything one guest can read that decides their booking state for one
/// event. Each field is a document the guest's own listener delivers.
class EventViewerSources {
  const EventViewerSources({
    required this.event,
    required this.profile,
    required this.participation,
    required this.now,
    this.communityMembership,
    this.membershipRules,
    this.hostMembership,
    this.publishedPlans = const [],
    this.upcomingMemberPricedBookings = 0,
    this.scheduledEvents = const [],
    this.hasInviteCode = false,
  });

  final Event event;
  final UserProfile? profile;
  final EventParticipation? participation;
  final DateTime now;

  /// Null when the guest holds no membership decision with the organizer.
  final GuestCommunityMembershipState? communityMembership;
  final EventMembershipRules? membershipRules;

  /// The guest's paid membership with this event's organizer, if any.
  final HostMembership? hostMembership;
  final List<HostMembershipPlan> publishedPlans;

  /// Other upcoming bookings this organizer's member price already covers.
  final int upcomingMemberPricedBookings;

  /// Events the guest is booked, waitlisted or attended at, for the
  /// overlapping-schedule check.
  final List<Event> scheduledEvents;
  final bool hasInviteCode;
}

/// Mirrors the order of Functions' viewer read (`readEventViewerStateSource`)
/// over the documents the guest can read. Three server checks stay with the
/// booking commands only, which reject with "event unavailable": a block
/// between the guest and someone on the roster, the seat ledger's holds, and
/// whether an invite code is valid (a typed code counts here).
EventViewerState composeEventViewerState(EventViewerSources sources) {
  final event = sources.event;
  final now = sources.now;
  final participation = sources.participation;
  final snapshot = participation == null
      ? null
      : ParticipationStatusSnapshot.of(participation, now: now);
  final offerActive = snapshot?.isWaitlistOfferActive ?? false;
  final hostApproved = snapshot?.hasHostApproval ?? false;
  final status = participation?.status;
  final confirmed =
      status == EventParticipationStatus.signedUp ||
      status == EventParticipationStatus.attended;
  final attendedAt = participation?.attendedAt;
  final policy = event.eventPolicy;
  final needsMembership =
      policy != null &&
      (eventRequiresCommunityMembership(policy) ||
          policy.admissionPolicy.approvedMembersSkipReview);
  final membership = !needsMembership
      ? EventViewerMembership.notRequired
      : switch (sources.communityMembership) {
          GuestCommunityMembershipState.active => EventViewerMembership.active,
          GuestCommunityMembershipState.revoked =>
            EventViewerMembership.revoked,
          null => EventViewerMembership.none,
        };

  int? quoted;
  EventHostMembershipFacts? facts;
  EventViewerState result({
    EventViewerRestriction? restriction,
    EventViewerRoute? route,
  }) => EventViewerState(
    eventId: event.id,
    organizerId: event.organizerId,
    membership: membership,
    review: hostApproved
        ? EventViewerReview.approved
        : participation?.hostApprovalStatus == EventJoinRequestStatus.pending
        ? EventViewerReview.pending
        : EventViewerReview.none,
    admission: confirmed
        ? EventViewerAdmission.nativeParticipation
        : EventViewerAdmission.none,
    attendance:
        status == EventParticipationStatus.attended &&
            attendedAt != null &&
            !attendedAt.isAfter(now)
        ? EventViewerAttendance.attended
        : EventViewerAttendance.notRecorded,
    waitlisted: status == EventParticipationStatus.waitlisted,
    restriction: restriction,
    route: route,
    quotedPriceInPaise: quoted,
    hostMembership: facts,
  );
  EventViewerState deny(EventViewerRestriction reason) =>
      result(restriction: reason);

  if (event.status == EventLifecycleStatus.cancelled) {
    return deny(EventViewerRestriction.cancelled);
  }
  if (policy == null) return deny(EventViewerRestriction.eventUnavailable);
  if (!event.startTime.isAfter(now)) return deny(EventViewerRestriction.past);
  if (event.eventOrigin?.bookingAuthority !=
      EventBookingAuthority.catchPlatform) {
    return deny(EventViewerRestriction.unsupportedRoute);
  }
  final profile = sources.profile;
  if (profile == null || !event.hasRequiredProfileDetails(profile, now)) {
    return deny(EventViewerRestriction.bookingDetailsRequired);
  }
  if (event.requiresRunPreferences && !profile.hasCurrentRunPreferences) {
    return deny(EventViewerRestriction.runPreferencesRequired);
  }
  final age = profile.ageOn(now);
  if (event.requiresAgeDetails &&
      age != null &&
      (age < event.constraints.minAge || age > event.constraints.maxAge)) {
    return deny(EventViewerRestriction.ageRestricted);
  }

  final roster = EventSignupRoster.fromEvent(event);
  final userCohort = policy.cohortResolver
      .resolve(EventAttendeeProfile.fromUserProfile(profile))
      .id;
  final cohortId = offerActive
      ? participation!.cohortAtSignup ?? userCohort
      : userCohort;
  final listPrice = eventSignupQuoteInPaise(
    policy: policy,
    cohortId: cohortId,
    roster: roster,
  );
  final memberPlanId = sources.hostMembership?.planId;
  final entitlement = evaluateHostMembershipEntitlement(
    listPriceInPaise: listPrice,
    rules: sources.membershipRules,
    membership: sources.hostMembership,
    plan: sources.publishedPlans
        .where((plan) => plan.id == memberPlanId)
        .firstOrNull,
    publishedPlans: sources.publishedPlans,
    upcomingMemberPricedBookings: sources.upcomingMemberPricedBookings,
    now: now,
  );
  // A waitlist offer's accept path keeps list price.
  quoted = offerActive ? listPrice : entitlement.priceInPaise;
  facts = hostMembershipEventFacts(
    entitlement: entitlement,
    membership: sources.hostMembership,
    rules: sources.membershipRules,
    listPriceOffer: offerActive,
  );

  final restriction = eventSignupRestriction(
    policy: policy,
    cohortId: cohortId,
    roster: roster,
    hasActiveCommunityMembership: membership == EventViewerMembership.active,
    hasHostApproval: hostApproved || offerActive,
    hasValidInvite:
        offerActive ||
        (snapshot?.isWaitlistOfferAccepted ?? false) ||
        sources.hasInviteCode,
  );
  if (restriction != null) return deny(restriction);
  if (!offerActive) {
    switch (entitlement.admissionBlock) {
      case HostMembershipAdmissionBlock.paidMembershipRequired:
        return deny(EventViewerRestriction.paidMembershipRequired);
      case HostMembershipAdmissionBlock.memberEarlyAccess:
        return deny(EventViewerRestriction.memberEarlyAccess);
      case null:
        break;
    }
  }
  final overlaps = sources.scheduledEvents.any(
    (other) =>
        other.id != event.id &&
        other.status != EventLifecycleStatus.cancelled &&
        other.startTime.isBefore(event.endTime) &&
        event.startTime.isBefore(other.endTime),
  );
  if (overlaps) return deny(EventViewerRestriction.scheduleConflict);
  return result(
    route: offerActive
        ? EventViewerRoute.catchWaitlistOffer
        : quoted == 0
        ? EventViewerRoute.catchFreeBooking
        : EventViewerRoute.catchCheckout,
  );
}
