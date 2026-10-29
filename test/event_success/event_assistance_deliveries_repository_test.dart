import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_deliveries_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAssistanceDeliveriesRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    repository = EventAssistanceDeliveriesRepository(functions);
  });

  test(
    'reads issue the exact scoped page request through the generated DTO',
    () async {
      final query = deliveryQuery(cursor: deliveryId());
      functions.response = deliveryPageResponse(
        query: query,
        rows: [deliveryRow(messageId: deliveryId(2))],
      );
      final page = await repository.fetch(query);
      expect(page.query, query);
      expect(functions.calls.single.name, 'listEventAssistanceDeliveries');
      expect(functions.calls.single.input, {
        'context': query.context,
        'cursor': deliveryId(),
      });
    },
  );

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
        await expectLater(repository.fetch(deliveryQuery()), throwsA(entry.$2));
        await expectLater(
          repository.apply(deliveryChange()),
          throwsA(entry.$2),
        );
      }
      expect(functions.calls, hasLength(6));
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
      functions.response = {'deliveries': []};
      await expectLater(
        repository.fetch(deliveryQuery()),
        throwsA(isA<BackendOperationException>()),
      );
      expect(functions.calls, hasLength(6));
    },
  );
}
