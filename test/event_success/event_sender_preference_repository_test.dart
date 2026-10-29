import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_participation_fixtures.dart';
import 'event_sender_preference_fixtures.dart';

void main() {
  for (final channel in EventSenderChannel.values) {
    group(channel.name, () {
      final scope = senderScope(channel);
      final suffix = channel == EventSenderChannel.whatsapp
          ? 'Whatsapp'
          : channel == EventSenderChannel.sms
          ? 'Sms'
          : 'Rcs';
      final preference = channel == EventSenderChannel.sms
          ? 'EventAssistanceSmsPreference'
          : 'Event${suffix}Preference';
      late ParticipationTestFunctions functions;
      late EventSenderPreferenceRepository repository;
      setUp(() {
        functions = ParticipationTestFunctions();
        repository = EventSenderPreferenceRepository(functions);
      });

      test(
        'discovery, review and exact retries use only the selected channel',
        () async {
          functions.response = senderPageRaw(scope);
          await repository.list(scope);
          expect(functions.calls.single.name, 'listEvent${suffix}Preferences');
          expect(functions.calls.single.input, {
            'eventId': scope.eventId,
            'attendeeId': scope.attendeeId,
            'cursor': null,
          });
          functions.response = senderResponse(scope);
          final view = await repository.fetch(scope, 'sender-1');
          expect(functions.calls.last.name, 'get$preference');
          expect(functions.calls.last.input, {
            'eventId': scope.eventId,
            'attendeeId': scope.attendeeId,
            'senderId': 'sender-1',
          });
          final change = view.prepareChange(
            requestId: 'one',
            decision: EventSenderPreferenceDecision.grant,
          );
          functions.response = senderAppliedRaw(change);
          await repository.apply(change);
          functions.response = senderAppliedRaw(
            change,
            outcome: 'replayed',
            patch: {'revision': 3, 'preference': 'disabled'},
          );
          final replay = await repository.apply(change);
          expect(functions.calls.last.name, 'set$preference');
          expect(functions.calls[2].input, functions.calls[3].input);
          expect(functions.calls.last.input, change.toJson());
          expect(replay.view.preference, EventSenderPreference.disabled);
        },
      );

      test(
        'malformed or foreign replies never become empty pages or successful writes',
        () async {
          final change = senderView(scope).prepareChange(
            requestId: 'one',
            decision: EventSenderPreferenceDecision.grant,
          );
          for (final data in [
            null,
            {},
            senderResponse(scope),
            senderAppliedRaw(change, patch: {'senderId': 'foreign'}),
            senderAppliedRaw(change, patch: {'preference': 'disabled'}),
          ]) {
            functions.response = data;
            await expectLater(
              repository.apply(change),
              throwsA(isA<BackendOperationException>()),
            );
          }
          functions.response = senderAppliedRaw(change);
          await expectLater(
            repository.fetch(scope, 'sender-1'),
            throwsA(isA<BackendOperationException>()),
          );
          functions.response = senderPageRaw(
            scope,
            patch: {'attendeeId': 'foreign'},
          );
          await expectLater(
            repository.list(scope),
            throwsA(isA<BackendOperationException>()),
          );
          final count = functions.calls.length;
          expect(
            () => repository.list(scope, cursor: 'wrong'),
            throwsFormatException,
          );
          expect(
            () => repository.fetch(scope, 'bad/id'),
            throwsFormatException,
          );
          expect(functions.calls, hasLength(count));
        },
      );

      test(
        'missing deployment, permission and network failures keep their meanings',
        () async {
          final change = senderView(scope).prepareChange(
            requestId: 'one',
            decision: EventSenderPreferenceDecision.grant,
          );
          for (final pair in [
            (
              'not-found',
              isA<BackendOperationException>().having(
                (e) => e.code,
                'code',
                'callable-unavailable',
              ),
            ),
            ('permission-denied', isA<PermissionException>()),
            ('unavailable', isA<NetworkException>()),
          ]) {
            functions.error = FirebaseFunctionsException(
              code: pair.$1,
              message: pair.$1 == 'not-found' ? 'NOT_FOUND' : 'Unavailable',
            );
            await expectLater(repository.list(scope), throwsA(pair.$2));
            await expectLater(
              repository.fetch(scope, 'sender-1'),
              throwsA(pair.$2),
            );
            await expectLater(repository.apply(change), throwsA(pair.$2));
          }
        },
      );
    });
  }
}
