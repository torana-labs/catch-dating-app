import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  EventRehearsalBootstrap read(Map<String, Object?> queue) =>
      EventRehearsalBootstrap.fromCallableData(
        practiceBootstrap(helpRequests: queue),
      );

  test(
    'rehearsal retains open, settled and untracked requests independently',
    () {
      final queue = practiceHelpRequests();
      (queue['untrackedActorIds']! as List).add('actor-02');
      final model = read(queue).helpRequests!;
      expect(model.cases.single, isA<RehearsalOpenHelpCase>());
      expect(model.untrackedActorIds, ['actor-02']);
      (queue['cases']! as List).clear();
      expect(model.cases.length, 1);
      expect(() => model.cases.clear(), throwsUnsupportedError);
      final closed =
          read(practiceHelpRequests(settled: true)).helpRequests!.cases.single
              as RehearsalClosedHelpCase;
      expect(
        closed.resolution.outcome,
        AssistanceCaseResolutionOutcome.resolved,
      );
      expect(closed.resolution.at, 1000);
      expect(practiceSnapshot().helpRequests, isNull);
    },
  );

  test(
    'every help decision binds the reviewed case and matches the command schema',
    () {
      final snapshot = read(practiceHelpRequests());
      final request =
          snapshot.helpRequests!.cases.single as RehearsalOpenHelpCase;
      final validator = JsonSchema.create(
        schemas.schemaContractsByName['ControlEventRehearsalCallablePayload']!,
      );
      for (final decision in [
        const AssistanceCaseDecision.resolve(),
        const AssistanceCaseDecision.decline(),
        AssistanceCaseDecision.transfer('host-2'),
      ]) {
        final command = RehearsalResolveAssistance(
          snapshot: request,
          actorUid: 'host-1',
          decision: decision,
        );
        final change = RehearsalAssistanceChange(
          snapshot: snapshot,
          command: command,
          clientActionId: 'help_request_1',
        );
        expect(validator.validate(change.toJson()).isValid, isTrue);
        final wire = command.toJson();
        expect(wire['expectedSourceHash'], request.sourceHash);
        expect(wire.containsKey('context'), isFalse);
        expect(
          () => RehearsalAssistanceChange(
            snapshot: read(practiceHelpRequests()),
            command: command,
            clientActionId: 'help_request_2',
          ),
          throwsFormatException,
        );
        expect(
          () => RehearsalAssistanceChange(
            snapshot: practiceSnapshot(),
            command: command,
            clientActionId: 'help_request_3',
          ),
          throwsFormatException,
        );
      }
    },
  );

  test('case handling remains available after rehearsal completion', () {
    final snapshot = EventRehearsalBootstrap.fromCallableData(
      practiceBootstrap(
        status: 'complete',
        helpRequests: practiceHelpRequests(),
      ),
    );
    final command = RehearsalResolveAssistance(
      snapshot: snapshot.helpRequests!.cases.single as RehearsalOpenHelpCase,
      actorUid: 'host-1',
      decision: const AssistanceCaseDecision.resolve(),
    );
    expect(
      RehearsalAssistanceChange(
        snapshot: snapshot,
        command: command,
        clientActionId: 'help_request_1',
      ).command,
      same(command),
    );
  });

  test(
    'wrong runs, foreign guests and inconsistent resolutions fail closed',
    () {
      for (final queue in [
        {...practiceHelpRequests(), 'clockId': 'clock:${'c' * 64}'},
        {...practiceHelpRequests(), 'coverage': 'page'},
        {
          ...practiceHelpRequests(),
          'untrackedActorIds': ['foreign'],
        },
        {
          ...practiceHelpRequests(),
          'cases': [practiceHelpCase(), practiceHelpCase()],
        },
        {
          ...practiceHelpRequests(),
          'cases': [
            {...practiceHelpCase(), 'attendeeId': 'foreign'},
          ],
        },
        {
          ...practiceHelpRequests(),
          'cases': [
            {...practiceHelpCase(), 'receivedAt': 1001},
          ],
        },
        {
          ...practiceHelpRequests(),
          'cases': [
            {...practiceHelpCase(), 'caseId': 'case:${'a' * 64}'},
          ],
        },
        {
          ...practiceHelpRequests(),
          'cases': [
            {...practiceHelpCase(), 'status': 'resolved'},
          ],
        },
        {
          ...practiceHelpRequests(),
          'cases': [
            {...practiceHelpCase(settled: true), 'canChange': true},
          ],
        },
      ]) {
        expect(() => read(queue), throwsFormatException);
      }
      final reset = practiceBootstrap(
        helpRequests: practiceHelpRequests(),
        setupRevision: 2,
      );
      expect(
        () => EventRehearsalBootstrap.fromCallableData(reset),
        throwsFormatException,
      );
    },
  );
}
