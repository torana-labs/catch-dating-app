import 'package:catch_dating_app/contexts/payments/payments.dart';

/// Auth-scoped observation from the canonical viewer read. It never grants a
/// reservation; each booking command rechecks its own current authority.
enum EventViewerMembership { notRequired, none, active, revoked, unavailable }

enum EventViewerReview { none, pending, approved }

enum EventViewerAdmission {
  none,
  nativeParticipation,
  publicPaidRoster,
  guestRoster,
}

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

enum EventViewerPayment {
  notRead,
  creatingOrder,
  orderUnknown,
  checkoutReady,
  verifying,
  captured,
  admitted,
  expired,
  refundPending,
  refunded,
  reviewRequired,
  failed,
  cancelled,
}

final class EventViewerState {
  const EventViewerState._({
    required this.eventId,
    required this.organizerId,
    required this.observedAtMillis,
    required this.membership,
    required this.membershipRevision,
    required this.membershipDecisionId,
    required this.review,
    required this.admission,
    required this.attendance,
    required this.waitlisted,
    required this.payment,
    required this.allowed,
    required this.restriction,
    required this.route,
    required this.quotedPriceInPaise,
    required this.policyHash,
    required this.inventoryRevision,
    required this.capacityRevision,
    required this.migrationRevision,
    required this.hostMembership,
  });

  final String eventId, organizerId;
  final int observedAtMillis;
  final EventViewerMembership membership;
  final int? membershipRevision;
  final String? membershipDecisionId;
  final EventViewerReview review;
  final EventViewerAdmission admission;
  final EventViewerAttendance attendance;
  final bool waitlisted;
  final EventViewerPayment payment;
  final bool allowed;
  final EventViewerRestriction? restriction;
  final EventViewerRoute? route;
  final int? quotedPriceInPaise;
  final String? policyHash;
  final int? inventoryRevision, capacityRevision, migrationRevision;

  /// Paid host membership facts; null when the server omitted them.
  final EventHostMembershipFacts? hostMembership;

  bool get hasAdmission => admission != EventViewerAdmission.none;
  bool get canBook => allowed && route != EventViewerRoute.catchWaitlistOffer;
  bool get canAcceptOffer =>
      allowed && route == EventViewerRoute.catchWaitlistOffer;

  factory EventViewerState.fromResponse(Object? data) {
    final envelope = _object(data, {'viewer'});
    const viewerKeys = {
      'eventId',
      'organizerId',
      'observedAtMillis',
      'membership',
      'review',
      'admission',
      'attendance',
      'waitlisted',
      'payment',
      'futureBooking',
      'route',
      'quotedPriceInPaise',
      'basis',
    };
    final rawViewer = envelope['viewer'];
    final hasMembershipFacts =
        rawViewer is Map && rawViewer.containsKey('hostMembership');
    final v = _object(
      rawViewer,
      hasMembershipFacts ? {...viewerKeys, 'hostMembership'} : viewerKeys,
    );
    final m = _object(v['membership'], {'state', 'revision', 'decisionId'});
    final future = _object(v['futureBooking'], {'allowed', 'reason'});
    final basis = _object(v['basis'], {
      'policyHash',
      'inventoryRevision',
      'capacityRevision',
      'migrationRevision',
    });
    final allowed = _boolean(future['allowed']);
    final restriction = future['reason'] == null
        ? null
        : _enum(future['reason'], EventViewerRestriction.values);
    final route = v['route'] == null
        ? null
        : _enum(v['route'], EventViewerRoute.values);
    final price = _integerOrNull(v['quotedPriceInPaise']);
    if (allowed != (restriction == null) ||
        allowed != (route != null) ||
        allowed &&
            (price == null ||
                route == EventViewerRoute.catchFreeBooking && price != 0 ||
                route == EventViewerRoute.catchCheckout && price == 0)) {
      throw const FormatException('Contradictory event viewer state');
    }
    return EventViewerState._(
      eventId: _string(v['eventId']),
      organizerId: _string(v['organizerId']),
      observedAtMillis: _integer(v['observedAtMillis']),
      membership: _enum(m['state'], EventViewerMembership.values),
      membershipRevision: _integerOrNull(m['revision']),
      membershipDecisionId: _stringOrNull(m['decisionId']),
      review: _enum(v['review'], EventViewerReview.values),
      admission: _enum(v['admission'], EventViewerAdmission.values),
      attendance: _enum(v['attendance'], EventViewerAttendance.values),
      waitlisted: _boolean(v['waitlisted']),
      payment: _enum(v['payment'], EventViewerPayment.values),
      allowed: allowed,
      restriction: restriction,
      route: route,
      quotedPriceInPaise: price,
      policyHash: _stringOrNull(basis['policyHash']),
      inventoryRevision: _integerOrNull(basis['inventoryRevision']),
      capacityRevision: _integerOrNull(basis['capacityRevision']),
      migrationRevision: _integerOrNull(basis['migrationRevision']),
      hostMembership: hasMembershipFacts
          ? EventHostMembershipFacts.fromMap(
              _object(v['hostMembership'], EventHostMembershipFacts.keys),
            )
          : null,
    );
  }
}

Map<Object?, Object?> _object(Object? value, Set<String> keys) {
  if (value is! Map ||
      value.length != keys.length ||
      !keys.every(value.containsKey)) {
    throw const FormatException('Invalid event viewer object');
  }
  return Map<Object?, Object?>.from(value);
}

T _enum<T extends Enum>(Object? value, List<T> values) => values.firstWhere(
  (item) => item.name == value,
  orElse: () => throw const FormatException('Invalid event viewer enum'),
);
String _string(Object? value) {
  if (value is! String || value.isEmpty || value.length > 180) {
    throw const FormatException('Invalid event viewer identifier');
  }
  return value;
}

String? _stringOrNull(Object? value) => value == null ? null : _string(value);
int _integer(Object? value) {
  if (value is! num ||
      !value.isFinite ||
      value < 0 ||
      value > 9007199254740991 ||
      value.toInt() != value) {
    throw const FormatException('Invalid event viewer revision');
  }
  return value.toInt();
}

int? _integerOrNull(Object? value) => value == null ? null : _integer(value);
bool _boolean(Object? value) => value is bool
    ? value
    : throw const FormatException('Invalid event viewer boolean');
