import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('EventParticipationRepository', () {
    late FakeFirebaseFirestore firestore;
    late EventParticipationRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = EventParticipationRepository(firestore);
    });

    test(
      'watchParticipationsForEvent emits only roster-visible statuses',
      () async {
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-1',
          status: 'signedUp',
        );
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-2',
          status: 'waitlisted',
        );
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-3',
          status: 'attended',
        );
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-4',
          status: 'cancelled',
        );
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-5',
          status: 'deleted',
        );

        await expectLater(
          repository.watchParticipationsForEvent(eventId: 'event-1'),
          emits(
            allOf(
              hasLength(3),
              everyElement(
                isA<EventParticipation>().having(
                  (participation) => participation.status,
                  'status',
                  isIn({
                    EventParticipationStatus.signedUp,
                    EventParticipationStatus.waitlisted,
                    EventParticipationStatus.attended,
                  }),
                ),
              ),
            ),
          ),
        );
      },
    );

    test(
      'fetchParticipationsForEvent returns only roster-visible statuses',
      () async {
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-1',
          status: 'signedUp',
        );
        await _seedParticipation(
          firestore,
          eventId: 'event-1',
          uid: 'runner-2',
          status: 'cancelled',
        );
        await _seedParticipation(
          firestore,
          eventId: 'event-2',
          uid: 'runner-3',
          status: 'signedUp',
        );

        final participations = await repository.fetchParticipationsForEvent(
          eventId: 'event-1',
        );

        expect(participations, hasLength(1));
        expect(participations.single.uid, 'runner-1');
        expect(participations.single.status, EventParticipationStatus.signedUp);
      },
    );

    test('roster retains the attendee check-in clock for live fairness', () {
      final createdAt = DateTime(2026, 5, 1, 9);
      final attendedAt = DateTime(2026, 5, 1, 10);
      final roster = EventParticipationRoster.fromParticipations([
        EventParticipation(
          id: 'event-1_runner-1',
          eventId: 'event-1',
          clubId: 'club-1',
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
          createdAt: createdAt,
          updatedAt: attendedAt,
          attendedAt: attendedAt,
        ),
      ]);

      expect(roster.checkedInAtByUid, {'runner-1': attendedAt});
    });
  });
}

Future<void> _seedParticipation(
  FakeFirebaseFirestore firestore, {
  required String eventId,
  required String uid,
  required String status,
}) async {
  final now = DateTime(2026, 5, 1, 10);
  await firestore
      .collection('eventParticipations')
      .doc(eventParticipationId(eventId: eventId, uid: uid))
      .set({
        'eventId': eventId,
        'organizerId': 'club-1',
        'uid': uid,
        'status': status,
        'createdAt': now,
        'updatedAt': now,
        'signedUpAt': status == 'signedUp' || status == 'attended' ? now : null,
        'waitlistedAt': status == 'waitlisted' ? now : null,
        'attendedAt': status == 'attended' ? now : null,
        'cancelledAt': status == 'cancelled' ? now : null,
        'deletedAt': status == 'deleted' ? now : null,
        'genderAtSignup': 'woman',
        'paymentId': null,
      });
}
