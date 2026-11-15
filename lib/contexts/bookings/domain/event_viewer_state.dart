import 'package:catch_dating_app/contexts/payments/payments.dart';

/// One guest's booking state for one event, composed on the device from the
/// documents they can read (`composeEventViewerState`). It never grants a
/// reservation; each booking command rechecks its own current authority.
enum EventViewerMembership { notRequired, none, active, revoked }

enum EventViewerReview { none, pending, approved }

enum EventViewerAdmission { none, nativeParticipation }

enum EventViewerAttendance { notRecorded, attended }

enum EventViewerRoute { catchFreeBooking, catchCheckout, catchWaitlistOffer }

enum EventViewerRestriction {
  membershipRequired,
  inviteRequired,
  reviewRequired,
  full,
  pairCapacityUnavailable,
  generalCapacityUnavailable,
  cohortCapacityUnavailable,
  outOfRatioReviewRequired,
  balanceUnavailable,
  bookingDetailsRequired,
  runPreferencesRequired,
  ageRestricted,
  scheduleConflict,
  eventUnavailable,
  past,
  cancelled,
  unsupportedRoute,

  /// The event is for paid members of a plan with members-only access.
  paidMembershipRequired,

  /// Paid members are booking early; general sale has not opened.
  memberEarlyAccess,
}

final class EventViewerState {
  EventViewerState({
    required this.eventId,
    required this.organizerId,
    required this.membership,
    required this.review,
    required this.admission,
    required this.attendance,
    required this.waitlisted,
    required this.restriction,
    required this.route,
    required this.quotedPriceInPaise,
    this.hostMembership,
  }) {
    final allowed = restriction == null;
    if (allowed != (route != null) ||
        allowed &&
            (quotedPriceInPaise == null ||
                route == EventViewerRoute.catchFreeBooking &&
                    quotedPriceInPaise != 0 ||
                route == EventViewerRoute.catchCheckout &&
                    quotedPriceInPaise == 0)) {
      throw StateError('Contradictory event viewer state');
    }
  }

  final String eventId, organizerId;
  final EventViewerMembership membership;
  final EventViewerReview review;
  final EventViewerAdmission admission;
  final EventViewerAttendance attendance;
  final bool waitlisted;
  final EventViewerRestriction? restriction;
  final EventViewerRoute? route;
  final int? quotedPriceInPaise;

  /// Paid host membership facts; null when the organizer has no plan or
  /// rules that touch this event.
  final EventHostMembershipFacts? hostMembership;

  bool get allowed => restriction == null;
  bool get hasAdmission => admission != EventViewerAdmission.none;
  bool get canBook => allowed && route != EventViewerRoute.catchWaitlistOffer;
  bool get canAcceptOffer =>
      allowed && route == EventViewerRoute.catchWaitlistOffer;
}
