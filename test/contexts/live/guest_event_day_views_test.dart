import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

/// Answers getEventChatAccess and records every callable, so a test proves
/// which reads reach Functions.
class _Functions extends Fake implements FirebaseFunctions {
  final calls = <String>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    return _Callable();
  }
}

class _Callable extends Fake implements HttpsCallable {
  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async =>
      _Result<T>(
        <String, Object?>{
              'eventId': 'event-1',
              'organizerId': 'org',
              'title': 'Lantern walk',
              'role': 'host',
              'room': {
                'status': 'notCreated',
                'revision': 0,
                'opensAtMillis': null,
                'closesAtMillis': null,
              },
              'membership': {
                'status': 'notJoined',
                'revision': 0,
                'notificationsMuted': false,
              },
              'canManage': true,
              'canJoin': false,
              'canReadMessages': false,
              'canPostMessages': false,
              'profileClaimRequired': false,
              'termsVersion': 'event-chat-v1',
            }
            as T,
      );
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}

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

  group('event chat access', () {
    test(
      'a guest with a directory row reads it without the callable',
      () async {
        final functions = _Functions();
        await db
            .collection('eventChatDirectoryEntries')
            .doc('${_eventId}_$_uid')
            .set({
              'schemaVersion': 1,
              'uid': _uid,
              'eventId': _eventId,
              'organizerId': 'org',
              'title': 'Lantern walk',
              'role': 'attendee',
              'eventStartAtMillis': 1790000000000,
              'room': {
                'status': 'open',
                'revision': 3,
                'opensAtMillis': null,
                'closesAtMillis': null,
              },
              'membership': {
                'status': 'joined',
                'revision': 2,
                'notificationsMuted': false,
              },
              'profileClaimed': true,
              'termsVersion': 'event-chat-v1',
              'updatedAtMillis': 1,
            });
        final access = await EventChatRepository(
          functions,
          firestore: db,
          currentUid: () => _uid,
          clock: _clock,
        ).access(_eventId);
        expect(access.canReadMessages, isTrue);
        expect(access.canPostMessages, isTrue);
        expect(access.canManage, isFalse);
        expect(functions.calls, isEmpty);
      },
    );

    test('a manager with no row asks the callable, which lets them open the '
        'room', () async {
      final functions = _Functions();
      final access = await EventChatRepository(
        functions,
        firestore: db,
        currentUid: () => 'manager-1',
        clock: _clock,
      ).access(_eventId);
      expect(access.canManage, isTrue);
      expect(functions.calls, ['getEventChatAccess']);
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
