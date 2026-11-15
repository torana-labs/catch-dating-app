import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_accountability_fixtures.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

/// The server's document: the owner's projection under `view`, stored as
/// Firestore holds it (JSON values, no undefined).
Map<String, Object?> _hostView(Map<String, Object?> wire) => {
  'sessionId': (wire['session']! as Map<String, Object?>)['id'],
  'organizerId': 'org-1',
  'ownerUid': 'host-1',
  'setupRevision': 0,
  'runtimeRevision': 1,
  'view': jsonDecode(jsonEncode(wire)),
};

void main() {
  test('the rehearsal follows the host view listener, with no poll', () async {
    final db = FakeFirebaseFirestore();
    final wire = practiceVisitBootstrap();
    final sessionId =
        (wire['session']! as Map<String, Object?>)['id']! as String;
    final views = db.collection('eventRehearsalHostViews');
    await views.doc(sessionId).set(_hostView(wire));
    final repository = EventRehearsalRepository(_NoFunctions(), firestore: db);
    final delivered = <EventRehearsalBootstrap>[];
    final subscription = repository.watch(sessionId).listen(delivered.add);
    addTearDown(subscription.cancel);
    await pumpEventQueue();
    expect(delivered, hasLength(1));
    expect(delivered.single.session.id, sessionId);

    // A guest action elsewhere rewrites the view; the screen hears it.
    (wire['session']! as Map<String, Object?>)['runtimeRevision'] = 2;
    await views.doc(sessionId).set(_hostView(wire));
    await pumpEventQueue();
    expect(delivered.last.session.runtimeRevision, 2);

    // A review reads one revision of the same document.
    expect((await repository.fetch(sessionId)).session.runtimeRevision, 2);
  });

  test(
    'a missing or mismatched view is an error, never an empty rehearsal',
    () async {
      final db = FakeFirebaseFirestore();
      final repository = EventRehearsalRepository(
        _NoFunctions(),
        firestore: db,
      );
      await expectLater(
        repository.watch('missing').first,
        throwsA(isA<AppException>()),
      );
      final wire = practiceVisitBootstrap();
      await db
          .collection('eventRehearsalHostViews')
          .doc('another')
          .set(_hostView(wire));
      await expectLater(repository.fetch('another'), throwsA(anything));
    },
  );
}
