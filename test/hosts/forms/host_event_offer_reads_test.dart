import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

const _expires = 2000000;

/// An `organizerEventOffers` document as the offer service stores it.
Map<String, Object?> _stored(
  String contactId, {
  String organizerId = 'org',
  String eventId = 'event-one',
  int revision = 2,
  String paymentStatus = 'none',
}) => {
  'offerId': HostEventOfferReads.offerId(
    organizerId: organizerId,
    eventId: eventId,
    contactId: contactId,
  ),
  'organizerId': organizerId,
  'eventId': eventId,
  'contactId': contactId,
  'applicationId': 'response-$contactId',
  'sourceKind': 'formResponse',
  'status': 'offered',
  'generation': 1,
  'revision': revision,
  'expiresAtMillis': _expires,
  'organizerPaymentLink': null,
  'offeredAtMillis': 1000,
  'createdAtMillis': 1000,
  'updatedAtMillis': 1000,
  'paymentSnapshot': {
    'eventPaymentRevision': 1,
    'eventPaymentHash': 'a' * 64,
    'expectedAmountMinor': 50000,
    'currency': 'INR',
    'reusablePaymentPageUrl': null,
    'paymentInstructions': 'Pay at the door',
    'messageTemplate': null,
    'expiresAtMillis': _expires,
    'collectionMode': 'manualInstructions',
    'personalPaymentLink': null,
  },
  'manualPayment': {
    'status': paymentStatus,
    'evidenceReference': paymentStatus == 'none' ? null : 'BANK-1',
    'evidenceRecordedAtMillis': paymentStatus == 'none' ? null : 1500,
    'reviewedByUid': null,
    'reviewedAtMillis': null,
    'reviewNote': null,
    'bankReceiptChecked': false,
    'attestedAmountMinor': null,
    'attestedCurrency': null,
    'attestedEventPaymentRevision': null,
    'attestedEventPaymentHash': null,
  },
};

Future<void> _put(FakeFirebaseFirestore db, Map<String, Object?> offer) => db
    .collection('organizerEventOffers')
    .doc(offer['offerId']! as String)
    .set(offer);

void main() {
  group('offer listeners', () {
    late FakeFirebaseFirestore db;
    var nowMillis = 1500;
    late HostEventOfferReads reads;

    setUp(() {
      db = FakeFirebaseFirestore();
      nowMillis = 1500;
      reads = HostEventOfferReads(
        db,
        clock: AppClock.custom(
          () => DateTime.fromMillisecondsSinceEpoch(nowMillis),
        ),
      );
    });

    test(
      'the server offer id is derived from organizer, event and contact',
      () {
        expect(
          HostEventOfferReads.offerId(
            organizerId: 'org',
            eventId: 'event-one',
            contactId: 'contact-one',
          ),
          matches(RegExp(r'^applicationoffer_[0-9a-f]{40}$')),
        );
      },
    );

    test(
      'lists only the selected people on this event and follows changes',
      () async {
        await _put(db, _stored('kabir'));
        await _put(db, _stored('zoya'));
        await _put(db, _stored('kabir', eventId: 'event-two'));
        final seen = <List<Map<String, Object?>>>[];
        final subscription = reads
            .watchOffers(
              organizerId: 'org',
              eventId: 'event-one',
              contactIds: const {'kabir'},
            )
            .listen(seen.add);
        await pumpEventQueue();
        expect(seen.last.single['contactId'], 'kabir');
        expect(seen.last.single['effectiveStatus'], 'offered');
        expect(seen.last.single['paymentStatus'], 'none');

        await _put(
          db,
          _stored('kabir', revision: 3, paymentStatus: 'evidenceSubmitted'),
        );
        await pumpEventQueue();
        expect(seen.last.single['revision'], 3);
        expect(seen.last.single['paymentStatus'], 'evidenceSubmitted');
        await subscription.cancel();
      },
    );

    test('an offered offer past its expiry reads as expired', () async {
      await _put(db, _stored('kabir'));
      nowMillis = _expires;
      final offer = await reads
          .watchOffer(
            organizerId: 'org',
            eventId: 'event-one',
            contactId: 'kabir',
          )
          .first;
      expect(offer!.status, HostOfferStatus.offered);
      expect(offer.effectiveStatus, HostOfferStatus.expired);
    });

    test('no selected people lists nothing without a read', () async {
      expect(
        await reads
            .watchOffers(
              organizerId: 'org',
              eventId: 'event-one',
              contactIds: const {},
            )
            .first,
        isEmpty,
      );
    });

    test('a read after a write waits for the written revision', () async {
      await _put(db, _stored('kabir'));
      final current = reads.currentOffer(
        organizerId: 'org',
        eventId: 'event-one',
        contactId: 'kabir',
        minRevision: 3,
      );
      await pumpEventQueue();
      await _put(db, _stored('kabir', revision: 3));
      expect((await current).revision, 3);
    });

    test('an offer document under another organizer fails closed', () async {
      final foreign = {..._stored('kabir'), 'organizerId': 'other'};
      await _put(db, foreign);
      await expectLater(
        reads.watchOffer(
          organizerId: 'org',
          eventId: 'event-one',
          contactId: 'kabir',
        ),
        emitsError(anything),
      );
    });
  });

  group('offer picker events', () {
    late FakeFirebaseFirestore db;
    late FirestoreHostOfferEventTargetsGateway targets;

    setUp(() {
      db = FakeFirebaseFirestore();
      targets = FirestoreHostOfferEventTargetsGateway(
        db,
        configurations: EventOfferConfigurationReads(db),
        clock: AppClock.custom(
          () => DateTime.fromMillisecondsSinceEpoch(1000000),
        ),
      );
    });

    Future<void> published(
      String id,
      int start, {
      String organizerId = 'org',
      String status = 'active',
    }) => db.collection('events').doc(id).set({
      'organizerId': organizerId,
      'publicationState': 'published',
      'status': status,
      'name': 'Published $id',
      'startTime': Timestamp.fromMillisecondsSinceEpoch(start),
      'eventTimezone': 'Asia/Kolkata',
    });

    Future<void> unpublished(String id, int start) =>
        db.collection('hostEventSummaries').doc(id).set({
          'organizerId': 'org',
          'eventId': id,
          'startTimeMillis': start,
          'status': 'active',
          'version': 1,
          'row': {
            'eventId': id,
            'name': 'Draft $id',
            'startTimeMillis': start,
            'timezone': 'Asia/Kolkata',
            'setupRevision': 2,
          },
        });

    test(
      'merges published and unpublished coming events, soonest first',
      () async {
        await published('pub-late', 3000000);
        await published('pub-past', 500000);
        await published('pub-cancelled', 2500000, status: 'cancelled');
        await published('pub-theirs', 2500000, organizerId: 'other');
        await unpublished('draft-soon', 2000000);
        final page = await targets.list(organizerId: 'org');
        expect(page.events.map((event) => event.eventId), [
          'draft-soon',
          'pub-late',
        ]);
        expect(page.events.first.publicationState, 'private');
        expect(page.events.first.setupRevision, 2);
        expect(page.events.last.publicationState, 'published');
        expect(page.nextCursor, isNull);
      },
    );

    // fake_cloud_firestore cannot start after a document-id order, so the
    // second page itself is left to the emulator and device journeys.
    test('a full page offers a cursor to the next one', () async {
      for (var index = 0; index < 30; index++) {
        await published('pub-$index', 2000000 + index * 2);
        await unpublished('draft-$index', 2000001 + index * 2);
      }
      final first = await targets.list(organizerId: 'org');
      expect(first.events, hasLength(50));
      expect(first.events.first.eventId, 'pub-0');
      expect(first.events.last.eventId, 'draft-24');
      expect(first.nextCursor, isNotNull);
    });

    test('a cursor from another organizer fails closed', () async {
      await published('pub-0', 2000000);
      for (var index = 0; index < 60; index++) {
        await published('pub-$index', 2000000 + index);
      }
      final first = await targets.list(organizerId: 'org');
      await expectLater(
        targets.list(organizerId: 'other', cursor: first.nextCursor),
        throwsA(anything),
      );
    });
  });
}
