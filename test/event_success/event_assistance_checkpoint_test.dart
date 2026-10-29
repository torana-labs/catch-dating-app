import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/record_event_assistance_checkpoint_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_checkpoint_fixtures.dart';

void main() {
  final schema = JsonSchema.create(
    schemas.schemaContractsByName['EventAssistanceCheckpointCallableResponse']!,
  );
  final commandSchema = JsonSchema.create(
    schemas
        .schemaContractsByName['RecordEventAssistanceCheckpointCallablePayload']!,
  );
  Map availability(Map<String, Object?> wire) =>
      checkpointBody(wire)['availability']! as Map;
  List<Map> members(Map<String, Object?> wire) =>
      (availability(wire)['members']! as List).cast<Map>();

  test(
    'canonical report outcomes, statuses and unavailability have complete native coverage',
    () {
      final properties =
          schemas.schemaContractsByName['EventAssistanceCheckpointCallableResponse']!['properties']!
              as Map;
      final view = (properties['view']! as Map)['properties']! as Map;
      expect(
        ((properties['outcome']! as Map)['enum']! as List).toSet(),
        AssistanceCheckpointOutcome.values.map((v) => v.name).toSet(),
      );
      final variants = ((view['availability']! as Map)['oneOf']! as List)
          .cast<Map>();
      final ready = variants
          .map((v) => v['properties']! as Map)
          .singleWhere((p) => p.containsKey('members'));
      final blocked = variants
          .map((v) => v['properties']! as Map)
          .singleWhere((p) => p.containsKey('reason'));
      expect(
        ((ready['reportStatus']! as Map)['enum']! as List).toSet(),
        AssistanceCheckpointReportStatus.values.map((v) => v.name).toSet(),
      );
      expect(
        ((blocked['reason']! as Map)['enum']! as List).toSet(),
        AssistanceCheckpointUnavailableReason.values.map((v) => v.name).toSet(),
      );
    },
  );
  test(
    'an empty departure requires an explicit report before it becomes complete',
    () {
      final view = checkpointResult(checkpointWire(ids: [])).view;
      expect(
        (view.availability as AssistanceCheckpointRoster).status,
        AssistanceCheckpointReportStatus.unreported,
      );
      final change = checkpointChange(
        view: view,
        decision: AssistanceCheckpointObservation([]),
      );
      final wire = checkpointAppliedWire(change);
      expect(schema.validate(wire).isValid, isTrue);
      change.requireResult(checkpointResult(wire));
      expect(
        (checkpointResult(wire).view.availability as AssistanceCheckpointRoster)
            .status,
        AssistanceCheckpointReportStatus.complete,
      );
      expect(
        commandSchema
            .validate(
              RecordEventAssistanceCheckpointCallableRequest(
                command: change.command,
                expectedSourceHash: view.sourceHash,
              ).toJson(),
            )
            .isValid,
        isTrue,
      );
    },
  );
  test(
    'unavailable original visits stay visible without receiving new arrival proof',
    () {
      for (final reason in AssistanceCheckpointVisitUnavailableReason.values) {
        final wire = checkpointWire(unavailableVisits: {'b': reason.name});
        expect(schema.validate(wire).isValid, isTrue);
        final view = checkpointResult(wire).view;
        expect(
          (view.availability as AssistanceCheckpointRoster).members.length,
          2,
        );
        expect(
          () => checkpointChange(view: view, decision: observedBoth),
          throwsFormatException,
        );
        checkpointChange(view: view, decision: observedA);
        final historical = checkpointResult(
          checkpointWire(
            observed: ['a', 'b'],
            unavailableVisits: {'b': reason.name},
          ),
        ).view;
        checkpointChange(view: historical, decision: observedBoth);
        expect(
          () => checkpointChange(view: historical, decision: observedA),
          throwsFormatException,
        );
        final correction = checkpointChange(
          view: historical,
          decision: AssistanceCheckpointObservation([
            'a',
          ], correctionReason: ' Recorded twice '),
        );
        correction.requireResult(
          checkpointResult(checkpointAppliedWire(correction)),
        );
        expect(correction.decision.correctionReason, 'Recorded twice');
      }
    },
  );
  test(
    'missing, changed and wrong destinations never expose an editable roster',
    () {
      for (final reason in AssistanceCheckpointUnavailableReason.values) {
        final wire = checkpointWire(reason: reason.name);
        expect(schema.validate(wire).isValid, isTrue);
        final view = checkpointResult(wire).view;
        expect(
          (view.availability as AssistanceCheckpointUnavailable).reason,
          reason,
        );
        expect(() => checkpointChange(view: view), throwsFormatException);
      }
    },
  );
  test(
    'observations must form a unique complete selection from this departure',
    () {
      final list = ['b', 'a'];
      final selection = AssistanceCheckpointObservation(list);
      list.clear();
      expect(selection.accountedFor, ['a', 'b']);
      expect(() => selection.accountedFor.add('c'), throwsUnsupportedError);
      expect(
        () => AssistanceCheckpointObservation(['a', 'a']),
        throwsFormatException,
      );
      expect(
        () => AssistanceCheckpointObservation(
          List.generate(1001, (i) => 'guest-$i'),
        ),
        throwsFormatException,
      );
      expect(
        () => AssistanceCheckpointObservation(['a'], correctionReason: '  '),
        throwsFormatException,
      );
      expect(
        () => checkpointChange(
          decision: AssistanceCheckpointObservation(['outsider']),
        ),
        throwsFormatException,
      );
      final change = checkpointChange(decision: selection);
      final payload = change.command;
      ((payload['payload']! as Map)['accountedFor']! as List).clear();
      expect((change.command['payload']! as Map)['accountedFor'], ['a', 'b']);
    },
  );
  test(
    'scope, ordering, report status and observed membership are checked together',
    () {
      final mutations = <void Function(Map<String, Object?>)>[
        (w) => checkpointBody(w)['groupId'] = 'other',
        (w) => checkpointBody(w)['progressRevision'] = 3,
        (w) => checkpointBody(w)['checkpointId'] = 'other',
        (w) => checkpointBody(w)['revision'] = 2,
        (w) => availability(w)['rosterId'] = 'departure-roster:${'6' * 64}',
        (w) => availability(w)['reportStatus'] = 'complete',
        (w) => members(w)[1]['observation'] = 'accountedFor',
        (w) => members(w)[1]['attendeeId'] = 'a',
        (w) => availability(w)['members'] = [members(w)[1], members(w)[0]],
        (w) => (checkpointBody(w)['report']! as Map)['reportedAt'] = 1001,
        (w) => (checkpointBody(w)['report']! as Map)['createdAt'] = 501,
        (w) => (checkpointBody(w)['report']! as Map)['accountedFor'] = [
          'outsider',
        ],
        (w) => checkpointBody(w)['extra'] = true,
      ];
      for (final mutate in mutations) {
        final wire = checkpointWire(observed: ['a']);
        mutate(wire);
        expect(() => checkpointResult(wire), throwsFormatException);
      }
    },
  );
  test(
    'applied reports must confirm the actor, exact observation set and correction',
    () {
      final change = checkpointChange();
      final mutations = <void Function(Map<String, Object?>)>[
        (w) => w['operationRevision'] = 2,
        (w) => checkpointBody(w)['serverTime'] = 999,
        (w) => (checkpointBody(w)['report']! as Map)['reportedBy'] = 'other',
        (w) => (checkpointBody(w)['report']! as Map)['reportedAt'] = 1999,
        (w) => (checkpointBody(w)['report']! as Map)['createdAt'] = 1999,
        (w) => (checkpointBody(w)['report']! as Map)['correctionReason'] =
            'unexpected',
        (w) {
          (checkpointBody(w)['report']! as Map)['accountedFor'] = ['b'];
          members(w)[0]['observation'] = 'unconfirmed';
          members(w)[1]['observation'] = 'accountedFor';
        },
      ];
      for (final mutate in mutations) {
        final wire = checkpointAppliedWire(change);
        mutate(wire);
        expect(
          () => change.requireResult(checkpointResult(wire)),
          throwsFormatException,
        );
      }
    },
  );
  test(
    'replay returns newer observations without restoring the original report',
    () {
      final change = checkpointChange();
      final wire = checkpointWire(observed: ['a', 'b'])
        ..addAll({'outcome': 'replayed', 'operationRevision': 1});
      checkpointBody(wire).addAll({'revision': 4, 'serverTime': 3000});
      (checkpointBody(wire)['report']! as Map<String, Object?>).addAll({
        'revision': 4,
        'reportedAt': 2500,
      });
      final result = checkpointResult(wire);
      change.requireResult(result);
      expect(result.view.report!.accountedFor, ['a', 'b']);
      expect(result.operationRevision, 1);
    },
  );
}
