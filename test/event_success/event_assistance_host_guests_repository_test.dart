import 'package:catch_dating_app/contexts/live/data/event_assistance_host_guests_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_host_guests.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_host_guests_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAssistanceHostGuestsRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions()..response = hostGuestsResponse();
    repository = EventAssistanceHostGuestsRepository(functions);
  });

  test(
    'one read preserves the selection and cannot trigger enrollment or sends',
    () async {
      final selection = hostGuestsSelection(attendeeIds: ['second', 'first']);
      functions.response = hostGuestsResponse(
        guests: [
          hostCurrentGuest(attendeeId: 'second'),
          hostCurrentGuest(attendeeId: 'first'),
        ],
      );
      final result = await repository.fetch(selection);
      expect(result.guests.map((r) => r.attendeeId), ['second', 'first']);
      expect(result.guests.first, isA<AssistanceCurrentGuest>());
      expect(functions.calls, hasLength(1));
      expect(functions.calls.single.name, 'getEventAssistanceHostGuests');
      expect(functions.calls.single.input, {
        'context': selection.context,
        'attendeeIds': selection.attendeeIds,
      });
    },
  );

  test('missing deployment and permission errors remain visible', () async {
    functions.error = FirebaseFunctionsException(
      code: 'not-found',
      message: 'NOT_FOUND',
    );
    await expectLater(
      repository.fetch(hostGuestsSelection()),
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'callable-unavailable',
        ),
      ),
    );
    functions.error = FirebaseFunctionsException(
      code: 'permission-denied',
      message: 'Denied',
    );
    await expectLater(
      repository.fetch(hostGuestsSelection()),
      throwsA(isA<PermissionException>()),
    );
    expect(functions.calls, hasLength(2));
  });

  test(
    'network and malformed response failures cannot become an empty view',
    () async {
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.fetch(hostGuestsSelection()),
        throwsA(isA<NetworkException>()),
      );
      expect(functions.calls, hasLength(1));
      functions.error = null;
      for (final raw in [
        null,
        {},
        hostGuestsResponse(guests: []),
        hostGuestsResponse(guests: [hostCurrentGuest(attendeeId: 'foreign')]),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.fetch(hostGuestsSelection()),
          throwsA(isA<BackendOperationException>()),
        );
      }
      expect(
        functions.calls,
        hasLength(5),
        reason: 'no hidden refetch or retries',
      );
    },
  );
}
