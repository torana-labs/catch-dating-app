import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';

Map<String, Object?> viewerResponse({
  String eventId = 'event-1',
  String organizerId = 'club-1',
  String membership = 'notRequired',
  String review = 'none',
  String admission = 'none',
  String attendance = 'notRecorded',
  String? reason,
  String? route,
  bool waitlisted = false,
  int price = 0,
}) => {
  'viewer': {
    'eventId': eventId,
    'organizerId': organizerId,
    'observedAtMillis': 1000,
    'membership': {'state': membership, 'revision': null, 'decisionId': null},
    'review': review,
    'admission': admission,
    'attendance': attendance,
    'waitlisted': waitlisted,
    'payment': 'notRead',
    'futureBooking': {'allowed': reason == null, 'reason': reason},
    'route': reason != null
        ? null
        : route ?? (price == 0 ? 'catchFreeBooking' : 'catchCheckout'),
    'quotedPriceInPaise': price,
    'basis': {
      'policyHash': null,
      'inventoryRevision': null,
      'capacityRevision': null,
      'migrationRevision': null,
    },
  },
};

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
}) => EventViewerState.fromResponse(
  viewerResponse(
    eventId: eventId,
    organizerId: organizerId,
    reason: reason,
    membership: membership,
    review: review,
    admission: admission,
    attendance: attendance,
    route: route,
    waitlisted: waitlisted,
    price: price,
  ),
);
