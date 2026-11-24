import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_event_facts.dart';

T _named<T extends Enum>(List<T> values, String name) =>
    values.firstWhere((value) => value.name == name);

/// A composed viewer state; [reason] names an [EventViewerRestriction].
EventViewerState viewerFixture({
  String? reason,
  String membership = 'notRequired',
  String review = 'none',
  String admission = 'none',
  String attendance = 'notRecorded',
  String? route,
  bool waitlisted = false,
  int price = 0,
  String eventId = 'event-1',
  String organizerId = 'club-1',
  EventHostMembershipFacts? hostMembership,
}) => EventViewerState(
  eventId: eventId,
  organizerId: organizerId,
  membership: _named(EventViewerMembership.values, membership),
  review: _named(EventViewerReview.values, review),
  admission: _named(EventViewerAdmission.values, admission),
  attendance: _named(EventViewerAttendance.values, attendance),
  waitlisted: waitlisted,
  restriction: reason == null
      ? null
      : _named(EventViewerRestriction.values, reason),
  route: reason != null
      ? null
      : _named(
          EventViewerRoute.values,
          route ?? (price == 0 ? 'catchFreeBooking' : 'catchCheckout'),
        ),
  quotedPriceInPaise: price,
  hostMembership: hostMembership,
);
