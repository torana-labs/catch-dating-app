import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

const _eventId = 'event-1';
const _uid = 'guest-1';
final _clock = AppClock.custom(
  () => DateTime.fromMillisecondsSinceEpoch(1790000000000),
);

void main() {
  late FakeFirebaseFirestore db;
  setUp(() => db = FakeFirebaseFirestore());

  group('participant context', () {
    EventParticipantContextRepository repository() =>
        EventParticipantContextRepository(db, _clock);

    Future<EventParticipantContext> read() =>
        repository().fetch(eventId: _eventId, subjectUid: _uid);

    test('a guest with no row, or no link, is unlinked', () async {
      expect((await read()).identity, isA<EventParticipantUnlinked>());
      await db.collection('guestEventStatuses').doc('${_eventId}_$_uid').set({
        'eventId': _eventId,
        'uid': _uid,
        'organizerId': 'org',
        'rosterLink': null,
      });
      expect((await read()).identity, isA<EventParticipantUnlinked>());
    });

    test('the linked row is the guest scope; two rows are ambiguous', () async {
      final ref = db.collection('guestEventStatuses').doc('${_eventId}_$_uid');
      await ref.set({
        'eventId': _eventId,
        'uid': _uid,
        'organizerId': 'org',
        'rosterLink': {'kind': 'linked', 'attendeeId': 'own-row'},
      });
      final linked = (await read()).identity as EventParticipantLinked;
      expect(linked.scope.attendeeId, 'own-row');
      expect(linked.scope.organizerId, 'org');
      expect(linked.sourceHash, isNull);
      await ref.set({
        'eventId': _eventId,
        'uid': _uid,
        'organizerId': 'org',
        'rosterLink': {'kind': 'ambiguous'},
      });
      expect((await read()).identity, isA<EventParticipantAmbiguous>());
    });

    test('a row of another guest or a guessed candidate fails', () async {
      await db.collection('guestEventStatuses').doc('${_eventId}_$_uid').set({
        'eventId': _eventId,
        'uid': 'someone-else',
        'organizerId': 'org',
        'rosterLink': {'kind': 'linked', 'attendeeId': 'their-row'},
      });
      await expectLater(read(), throwsA(isA<Exception>()));
      await db.collection('guestEventStatuses').doc('${_eventId}_$_uid').set({
        'eventId': _eventId,
        'uid': _uid,
        'organizerId': 'org',
        'rosterLink': {
          'kind': 'linked',
          'attendeeId': 'own-row',
          'phoneE164': '+919800000001',
        },
      });
      await expectLater(read(), throwsA(isA<Exception>()));
    });
  });

  group('room layout', () {
    test('reads the view; no view or a null layout is no map', () async {
      final repository = EventSuccessRepository(db);
      expect(await repository.watchSpatialLayout(_eventId).first, isNull);
      await db.collection('eventSuccessLayoutViews').doc(_eventId).set({
        'eventId': _eventId,
        'organizerId': 'org',
        'layout': {
          'layoutId': 'hall',
          'label': 'Main hall',
          'units': [
            {
              'id': 'table-1',
              'label': 'Table 1',
              'shape': 'round',
              'capacity': 6,
              'gridX': 0,
              'gridY': 0,
              'order': 0,
            },
          ],
        },
        'version': 1,
      });
      final layout = await repository.watchSpatialLayout(_eventId).first;
      expect(layout?.label, 'Main hall');
      expect(layout?.units.single.capacity, 6);
      await db.collection('eventSuccessLayoutViews').doc(_eventId).update({
        'layout': null,
      });
      expect(await repository.watchSpatialLayout(_eventId).first, isNull);
    });
  });
}
