import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_async/fake_async.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_deliveries_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late FakeFirebaseFirestore db;
  late EventAssistanceDeliveriesRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    db = FakeFirebaseFirestore();
    repository = EventAssistanceDeliveriesRepository(db, functions);
  });

  Future<void> seed(
    Map<String, Object?> row, {
    String organizerId = 'organizer-1',
    String eventId = 'event-1',
    int? relevantUntil,
  }) async {
    final view = deliveryView(
      row,
      query: deliveryQuery(organizerId: organizerId, eventId: eventId),
      relevantUntil: relevantUntil,
    );
    await db.collection('hostEventDeliveryViews').doc(view.id).set({
      ...view.data,
      'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(2000),
    });
  }

  test(
    'the listener reads one event page by organizer and event, in id order',
    () async {
      for (var i = 51; i >= 1; i--) {
        await seed(deliveryRow(messageId: deliveryId(i)));
      }
      await seed(
        deliveryRow(messageId: deliveryId(90)),
        eventId: 'another-event',
      );
      await seed(
        deliveryRow(messageId: deliveryId(91)),
        organizerId: 'another-organizer',
      );
      final first = await repository.watchPage(deliveryQuery()).first;
      expect(first.deliveries, hasLength(50));
      expect(first.deliveries.first.scope.messageId, deliveryId());
      // The next page starts after this cursor; the fake Firestore cannot
      // apply a document-id cursor, so the provider and widget tests page.
      expect(first.nextCursor, deliveryId(50));
    },
  );

  test('a handoff lapses on screen when the app clock reaches it', () {
    fakeAsync((async) {
      final start = DateTime.fromMillisecondsSinceEpoch(3000);
      final clock = AppClock.custom(() => start.add(async.elapsed));
      final timed = EventAssistanceDeliveriesRepository(
        db,
        functions,
        clock: clock,
      );
      unawaited(seed(deliveryRow(), relevantUntil: 4000));
      async.flushMicrotasks();
      final pages = <bool>[];
      final subscription = timed
          .watchPage(deliveryQuery())
          .listen(
            (page) => pages.add(
              page.deliveries.single is AssistanceActionableDelivery,
            ),
          );
      async.flushMicrotasks();
      expect(pages, [true]);
      async.elapse(const Duration(milliseconds: 999));
      expect(pages, [true]);
      async.elapse(const Duration(milliseconds: 1));
      expect(pages, [true, false]);
      unawaited(subscription.cancel());
    });
  });

  test('a view the server could not evaluate fails the page', () async {
    final row = deliveryRow();
    final view = deliveryView(row, sourceCoverage: 'invalidSource');
    await db.collection('hostEventDeliveryViews').doc(view.id).set({
      ...view.data,
      'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(2000),
    });
    await expectLater(
      repository.watchPage(deliveryQuery()).first,
      throwsA(isA<BackendOperationException>()),
    );
  });

  test('handoff and exact replay use one immutable reviewed payload', () async {
    final change = deliveryChange();
    functions.response = deliveryResultResponse(change);
    expect((await repository.apply(change)).operationRevision, 1);
    final call = functions.calls.single;
    expect(call.name, 'repairEventAssistanceDelivery');
    expect(call.input, {
      'command': change.command,
      'expectedMessageRevision': change.snapshot.revision,
      'expectedReviewHash': change.snapshot.reviewHash,
    });
    functions.response = deliveryResultResponse(change, outcome: 'replayed');
    expect(
      (await repository.apply(change)).outcome,
      AssistanceDeliveryChangeOutcome.replayed,
    );
    expect(functions.calls.last.input, call.input);
  });

  test(
    'missing deployment, offline and permission failures remain visible',
    () async {
      for (final entry in [
        (
          FirebaseFunctionsException(code: 'not-found', message: 'NOT_FOUND'),
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
        (
          FirebaseFunctionsException(
            code: 'permission-denied',
            message: 'Denied',
          ),
          isA<PermissionException>(),
        ),
        (
          FirebaseFunctionsException(code: 'unavailable', message: 'Offline'),
          isA<NetworkException>(),
        ),
      ]) {
        functions.error = entry.$1;
        await expectLater(
          repository.apply(deliveryChange()),
          throwsA(entry.$2),
        );
      }
      expect(functions.calls, hasLength(3));
    },
  );

  test(
    'malformed or foreign receipts never settle locally or retry automatically',
    () async {
      final change = deliveryChange();
      for (final raw in [
        null,
        {},
        deliveryResultResponse(change, rowPatch: {'revision': 0}),
        deliveryResultResponse(change, rowPatch: {'attendeeId': 'foreign'}),
        deliveryResultResponse(
          change,
          rowPatch: {
            'handling': {'kind': 'automatic'},
          },
        ),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.apply(change),
          throwsA(isA<BackendOperationException>()),
        );
      }
      expect(functions.calls, hasLength(5));
    },
  );
}
