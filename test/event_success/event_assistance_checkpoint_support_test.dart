import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_checkpoint_fixtures.dart';

void main() {
  final schema = JsonSchema.create(
    schemas.schemaContractsByName['EventAssistanceCheckpointCallableResponse']!,
  );
  Map body(Map<String, Object?> wire) => checkpointBody(wire);
  Map closeout(Map<String, Object?> wire) => body(wire)['closeout']! as Map;
  List<Map> members(Map<String, Object?> wire) =>
      ((body(wire)['availability']! as Map)['members']! as List).cast<Map>();
  test(
    'request states and all member evidence reasons have exhaustive enum coverage',
    () {
      final props =
          schemas.schemaContractsByName['EventAssistanceCheckpointCallableResponse']!['properties']!
              as Map;
      final view = (props['view']! as Map)['properties']! as Map;
      final requestVariants =
          ((((view['request']! as Map)['anyOf']! as List).first
                      as Map)['oneOf']!
                  as List)
              .cast<Map>();
      final states = <Object?>{}, owners = <Object?>{};
      for (final variant in requestVariants) {
        final p = variant['properties']! as Map;
        states.addAll((p['state']! as Map)['enum']! as List);
        final owner = p['ownerAvailability']! as Map;
        owners.addAll(
          owner.containsKey('enum') ? owner['enum']! as List : [owner['const']],
        );
      }
      expect(
        states,
        AssistanceCheckpointRequestState.values.map((v) => v.name).toSet(),
      );
      expect(
        owners,
        AssistanceCheckpointOwnerAvailability.values.map((v) => v.name).toSet(),
      );
      final ready = ((view['availability']! as Map)['oneOf']! as List)
          .cast<Map>()
          .map((v) => v['properties']! as Map)
          .singleWhere((p) => p.containsKey('members'));
      final member =
          ((ready['members']! as Map)['items']! as Map)['properties']! as Map;
      final visit = ((member['visit']! as Map)['oneOf']! as List)
          .cast<Map>()
          .map((v) => v['properties']! as Map)
          .singleWhere((p) => p.containsKey('reason'));
      expect(
        ((visit['reason']! as Map)['enum']! as List).toSet(),
        AssistanceCheckpointVisitUnavailableReason.values
            .map((v) => v.name)
            .toSet(),
      );
      final disposition = ((member['disposition']! as Map)['oneOf']! as List)
          .cast<Map>()
          .map((v) => v['properties']! as Map)
          .singleWhere((p) => p.containsKey('reason'));
      expect(
        ((disposition['reason']! as Map)['enum']! as List).toSet(),
        AssistanceCheckpointDispositionUnavailableReason.values
            .map((v) => v.name)
            .toSet(),
      );
    },
  );
  test(
    'legacy omitted evidence stays unknown and differs from explicit null or unresolved',
    () {
      final wire = checkpointWire();
      final current = checkpointResult(wire).view;
      expect(current.assignment.isProvided, isTrue);
      expect(current.assignment.value, isNull);
      body(wire).remove('assignment');
      body(wire).remove('closeout');
      members(wire)[0].remove('disposition');
      final legacy = checkpointResult(wire).view;
      expect(legacy.assignment.isProvided, isFalse);
      expect(legacy.closeout.isProvided, isFalse);
      final roster = legacy.availability as AssistanceCheckpointRoster;
      expect(
        roster.members[0].disposition,
        isA<AssistanceCheckpointDispositionNotProvided>(),
      );
      expect(
        roster.members[1].disposition,
        isA<AssistanceCheckpointDispositionUnresolved>(),
      );
      expect(roster.members.every((m) => !m.accountedFor), isTrue);
    },
  );
  test(
    'requests preserve deadline, discrepancy and owner loss independently of observation rights',
    () {
      for (final state in [
        'awaitingReport',
        'overdue',
        'discrepancy',
        'complete',
        'sourceUnavailable',
      ]) {
        final wire = checkpointWire(
          observed: state == 'complete'
              ? ['a', 'b']
              : state == 'discrepancy' || state == 'sourceUnavailable'
              ? ['a']
              : null,
          reason: state == 'sourceUnavailable' ? 'setupChanged' : null,
          requestState: state,
          dueAt: state == 'overdue' ? 900 : 1500,
        );
        expect(schema.validate(wire).isValid, isTrue);
        final view = checkpointResult(wire).view;
        expect(view.request!.state.name, state);
        if (state != 'complete') {
          (body(wire)['request']! as Map)['ownerAvailability'] =
              'needsReassignment';
          final unavailableOwner = checkpointResult(wire).view;
          expect(
            unavailableOwner.request!.ownerAvailability,
            AssistanceCheckpointOwnerAvailability.needsReassignment,
          );
          expect(unavailableOwner.canReport, state != 'sourceUnavailable');
        }
      }
      final premature = checkpointWire(requestState: 'overdue');
      expect(() => checkpointResult(premature), throwsFormatException);
      final mismatch = checkpointWire(requestState: 'awaitingReport');
      (body(mismatch)['request']! as Map)['ownerAvailability'] = 'notRequired';
      expect(() => checkpointResult(mismatch), throwsFormatException);
    },
  );
  test(
    'a closed request does not invent checkpoint arrival for a departed guest',
    () {
      final wire = checkpointClosedWire();
      expect(schema.validate(wire).isValid, isTrue);
      final view = checkpointResult(wire).view;
      expect(view.request!.state, AssistanceCheckpointRequestState.closedOut);
      expect(
        (view.availability as AssistanceCheckpointRoster).status,
        AssistanceCheckpointReportStatus.partial,
      );
      final guest =
          (view.availability as AssistanceCheckpointRoster).members[1];
      expect(guest.accountedFor, isFalse);
      expect(guest.disposition, isA<AssistanceCheckpointResolvedDisposition>());
      expect(
        view.closeout.value!.state.kind,
        AssistanceCheckpointCloseoutKind.closedOut,
      );
      final decision =
          view.closeout.value!.change!.decision as AssistanceCheckpointClosed;
      expect(decision.report.accountedFor, ['a']);
      expect(decision.dispositions.keys, ['b']);
      expect(() => decision.dispositions.clear(), throwsUnsupportedError);
    },
  );
  test(
    'closeout history survives changed reports, complete observations and explicit reopening',
    () {
      for (final state in ['needsReview', 'superseded', 'reopened']) {
        final wire = checkpointClosedWire();
        final c = closeout(wire);
        final request = body(wire)['request']! as Map;
        if (state == 'needsReview') {
          c['state'] = {'kind': state, 'reason': 'reportChanged'};
          c['eligibility'] = {'kind': 'ready'};
          body(wire)['revision'] = 2;
          (body(wire)['report']! as Map)['revision'] = 2;
          request['state'] = 'discrepancy';
          request['ownerAvailability'] = 'current';
        } else if (state == 'superseded') {
          c['state'] = {'kind': state};
          c['eligibility'] = {
            'kind': 'unavailable',
            'reason': 'reportComplete',
            'attendeeIds': <String>[],
          };
          body(wire)['revision'] = 2;
          (body(wire)['report']! as Map)['revision'] = 2;
          (body(wire)['report']! as Map)['accountedFor'] = ['a', 'b'];
          members(wire)[1]['observation'] = 'accountedFor';
          (body(wire)['availability']! as Map)['reportStatus'] = 'complete';
          request['state'] = 'complete';
        } else {
          c['state'] = {'kind': state};
          c['eligibility'] = {'kind': 'ready'};
          c['revision'] = 2;
          (c['change']! as Map)['revision'] = 2;
          (c['change']! as Map)['previousRevision'] = 1;
          (c['change']! as Map)['decision'] = {'kind': 'reopen'};
          request['state'] = 'discrepancy';
          request['ownerAvailability'] = 'current';
        }
        expect(schema.validate(wire).isValid, isTrue);
        expect(
          checkpointResult(wire).view.closeout.value!.state.kind.name,
          state,
        );
      }
    },
  );
  test(
    'reporter reassignment retains its own revision and does not grant observation authority',
    () {
      final wire = checkpointWire(requestState: 'awaitingReport');
      body(wire)['assignment'] = {
        'revision': 3,
        'sourceHash': '5' * 64,
        'change': {
          'revision': 3,
          'receiptId': 'checkpoint-reassignment:${'6' * 64}',
          'responsibleOperatorId': 'pacer-1',
          'previousResponsibleOperatorId': 'pacer-0',
          'assignedBy': 'host-1',
          'assignedAt': 800,
          'reason': 'Shift changed',
        },
      };
      expect(schema.validate(wire).isValid, isTrue);
      final view = checkpointResult(wire).view;
      expect(view.revision, 0);
      expect(view.assignment.value!.revision, 3);
      (body(wire)['request']! as Map)['responsibleOperatorId'] = 'other';
      expect(() => checkpointResult(wire), throwsFormatException);
    },
  );
  test(
    'malformed closeout witnesses and contradictory current states are rejected',
    () {
      final mutations = <void Function(Map<String, Object?>)>[
        (w) => closeout(w)['revision'] = 2,
        (w) => (closeout(w)['change']! as Map)['changedAt'] = 1001,
        (w) => (closeout(w)['change']! as Map)['previousRevision'] = 5,
        (w) => closeout(w)['state'] = {'kind': 'reopened'},
        (w) => closeout(w)['state'] = {
          'kind': 'needsReview',
          'reason': 'invented',
        },
        (w) =>
            ((closeout(w)['change']! as Map)['decision']!
                    as Map)['dispositions'] =
                <Object?>[],
        (w) =>
            (((closeout(w)['change']! as Map)['decision']! as Map)['report']!
                    as Map)['rosterHash'] =
                'c' * 64,
        (w) =>
            ((((closeout(w)['change']! as Map)['decision']!
                                as Map)['dispositions']!
                            as List)
                        .first
                    as Map)['attendeeId'] =
                'outsider',
        (w) => closeout(w)['eligibility'] = {
          'kind': 'unavailable',
          'reason': 'unresolvedMembers',
          'attendeeIds': <String>[],
        },
        (w) => body(w)['request'] = null,
        (w) => members(w)[1]['visit'] = {
          'kind': 'unavailable',
          'reason': 'visitChanged',
        },
      ];
      for (final mutate in mutations) {
        final wire = checkpointClosedWire();
        mutate(wire);
        expect(() => checkpointResult(wire), throwsFormatException);
      }
    },
  );
}
