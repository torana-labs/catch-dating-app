import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schemas/reassign_event_assistance_checkpoint_reporter_callable_payload.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schemas/set_event_assistance_checkpoint_closeout_callable_payload.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_fixtures.dart';

void main() {
  test(
    'complete arrival evidence supersedes closeout and disables request actions',
    () {
      final wire = checkpointClosedWire();
      final body = checkpointBody(wire);
      body['revision'] = 2;
      (body['report']! as Map)['revision'] = 2;
      (body['report']! as Map)['reportedAt'] = 950;
      (body['report']! as Map)['accountedFor'] = ['a', 'b'];
      final available = body['availability']! as Map;
      available['reportStatus'] = 'complete';
      ((available['members']! as List)[1] as Map)['observation'] =
          'accountedFor';
      (body['request']! as Map)['state'] = 'complete';
      final closeout = body['closeout']! as Map;
      closeout['state'] = {'kind': 'superseded'};
      closeout['eligibility'] = {
        'kind': 'unavailable',
        'reason': 'reportComplete',
        'attendeeIds': <String>[],
      };
      final review = requestReview(wire: wire);
      expect(review.canAct, isFalse);
      expect(
        () => requestChange(
          wire: wire,
          decision: ReopenCheckpointRequest('Not needed'),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'manager, responsible observer and other observer have distinct actions',
    () {
      final manager = requestReview();
      expect(manager.canReassign, isTrue);
      expect(manager.canClose, isTrue);
      for (final authority in ['readOnly', 'canConfirm']) {
        final observerWire = requestReadyWire();
        checkpointBody(observerWire)['reporterOptions'] = null;
        final owner = requestReview(
          wire: observerWire,
          operator: checkpointOperator(
            actorUid: 'pacer-1',
            authority: authority,
            reporter: 'selfOnly',
          ),
        );
        expect(owner.canReassign, isFalse);
        expect(owner.canClose, isTrue);
        final other = requestReview(
          wire: observerWire,
          operator: checkpointOperator(
            actorUid: 'other',
            authority: authority,
            reporter: 'selfOnly',
          ),
        );
        expect(other.canAct, isFalse);
        expect(
          () => requestChange(operator: other.operator),
          throwsFormatException,
        );
      }
    },
  );
  test(
    'closed runtime does not erase current permission to resolve outstanding work',
    () {
      final review = requestReview(
        operator: checkpointOperator(eventOpen: false),
      );
      expect(review.operator.canConfirm, isFalse);
      expect(review.canClose, isTrue);
      expect(review.canReassign, isTrue);
    },
  );
  test('scope and permission expiry are checked across both reads', () {
    expect(
      () => requestReview(
        operator: checkpointOperator(
          scope: EventAssistanceGroupScope(
            organizerId: 'org-1',
            eventId: 'event-1',
            groupId: 'other',
          ),
        ),
      ),
      throwsFormatException,
    );
    expect(
      () => requestReview(
        operator: checkpointOperator(now: 900, validUntil: 1000),
      ),
      throwsFormatException,
    );
  });
  test('legacy or unresolved evidence cannot become closeout permission', () {
    for (final wire in [checkpointWire(), requestReadyWire(resolved: false)]) {
      final review = requestReview(wire: wire);
      expect(review.canClose, isFalse);
      expect(() => requestChange(wire: wire), throwsFormatException);
    }
    final wire = requestReadyWire(resolved: false);
    (checkpointBody(wire)['closeout']! as Map)['eligibility'] = {
      'kind': 'ready',
    };
    expect(requestReview(wire: wire).canClose, isFalse);
    final unknown = requestReadyWire();
    checkpointBody(unknown).remove('reporterOptions');
    checkpointBody(unknown).remove('assignment');
    checkpointBody(unknown).remove('closeout');
    expect(requestReview(wire: unknown).canAct, isFalse);
  });
  test('close, reopen and reassign have independent eligibility', () {
    final closed = requestReview(wire: checkpointClosedWire());
    expect(closed.canClose, isFalse);
    expect(closed.canReassign, isFalse);
    expect(closed.canReopen, isTrue);
    expect(requestReview().canReopen, isFalse);
    expect(
      () => requestChange(decision: ReopenCheckpointRequest('Review again')),
      throwsFormatException,
    );
    expect(
      () => requestChange(
        decision: ReassignCheckpointReporter(
          reporterId: 'pacer-1',
          reason: 'Same reporter',
        ),
      ),
      throwsFormatException,
    );
    final unavailable = checkpointClosedWire();
    checkpointBody(unavailable)['availability'] = {
      'kind': 'unavailable',
      'reason': 'setupChanged',
    };
    (checkpointBody(unavailable)['request']! as Map).addAll(<String, Object>{
      'state': 'sourceUnavailable',
      'ownerAvailability': 'current',
    });
    final closeout = checkpointBody(unavailable)['closeout']! as Map;
    closeout['state'] = {'kind': 'needsReview', 'reason': 'sourceUnavailable'};
    closeout['eligibility'] = {
      'kind': 'unavailable',
      'reason': 'sourceUnavailable',
      'attendeeIds': <String>[],
    };
    expect(requestReview(wire: unavailable).canReopen, isTrue);
  });
  test(
    'all commands match canonical schemas and preserve independent source fences',
    () {
      for (final decision in <CheckpointRequestDecision>[
        reassignReporter,
        CloseCheckpointRequest(' Departed '),
        ReopenCheckpointRequest(' Recheck '),
      ]) {
        final before = decision is ReopenCheckpointRequest
            ? checkpointClosedWire()
            : requestReadyWire();
        final change = requestChange(decision: decision, wire: before);
        final input = {
          'command': change.command,
          'expectedSourceHash': change.sourceHash,
        };
        final schema = JsonSchema.create(
          change.isReassignment
              ? schemaReassignEventAssistanceCheckpointReporterCallablePayloadSchema
              : schemaSetEventAssistanceCheckpointCloseoutCallablePayloadSchema,
        );
        expect(schema.validate(input).isValid, isTrue);
        expect(change.sourceHash, isNot(change.snapshot.sourceHash));
        final payload = change.command['payload']! as Map;
        expect(
          payload['expectedProgressRevision'],
          checkpointScope.progressRevision,
        );
        expect(payload.containsKey('accountedFor'), isFalse);
        expect(payload.containsKey('dispositions'), isFalse);
        expect(payload['reason'], decision.reason);
        payload['reason'] = 'Mutated';
        expect((change.command['payload']! as Map)['reason'], decision.reason);
        change.requireResult(
          checkpointResult(requestAppliedWire(change, before: before)),
        );
      }
    },
  );
  test(
    'blank reasons, unsafe reporter IDs and exhausted revisions are rejected',
    () {
      for (final text in ['', '  ', 'x' * 501]) {
        expect(() => CloseCheckpointRequest(text), throwsFormatException);
        expect(() => ReopenCheckpointRequest(text), throwsFormatException);
        expect(
          () => ReassignCheckpointReporter(reporterId: 'sweep-2', reason: text),
          throwsFormatException,
        );
      }
      for (final id in ['', 'a/b', 'x' * 129]) {
        expect(
          () => ReassignCheckpointReporter(reporterId: id, reason: 'New shift'),
          throwsFormatException,
        );
      }
      final wire = requestAppliedWire(
        requestChange(decision: reassignReporter),
      );
      final assignment = checkpointBody(wire)['assignment']! as Map;
      assignment['revision'] = 9007199254740991;
      (assignment['change']! as Map)['revision'] = 9007199254740991;
      wire['outcome'] = 'read';
      wire['operationRevision'] = null;
      expect(requestReview(wire: wire).canReassign, isFalse);
    },
  );
  test(
    'applied receipts confirm actor, reason, previous owner and immutable deadline',
    () {
      final change = requestChange(decision: reassignReporter);
      for (final field in [
        'assignedBy',
        'reason',
        'previousResponsibleOperatorId',
        'responsibleOperatorId',
      ]) {
        final wire = requestAppliedWire(change);
        ((checkpointBody(wire)['assignment']! as Map)['change']!
                as Map)[field] =
            'wrong';
        expect(
          () => change.requireResult(checkpointResult(wire)),
          throwsFormatException,
        );
      }
      for (final field in ['sourceHash', 'serverTime']) {
        final wire = requestAppliedWire(change);
        checkpointBody(wire)[field] = field == 'sourceHash' ? '0' * 64 : 999;
        expect(
          () => change.requireResult(checkpointResult(wire)),
          throwsFormatException,
        );
      }
      final wire = requestAppliedWire(change);
      (checkpointBody(wire)['request']! as Map)['dueAt'] = 1700;
      expect(
        () => change.requireResult(checkpointResult(wire)),
        throwsFormatException,
      );
    },
  );
  test(
    'closeout cannot replace reviewed report or any disposition witness',
    () {
      final change = requestChange();
      for (final field in [
        'disposition',
        'revision',
        'resolvedBy',
        'sourceHash',
        'resolvedAt',
      ]) {
        final wire = checkpointCopy(requestAppliedWire(change));
        final saved =
            ((checkpointBody(wire)['closeout']! as Map)['change']!
                    as Map)['decision']!
                as Map;
        final witness = (saved['dispositions']! as List).single as Map;
        witness[field] = switch (field) {
          'disposition' => 'returned',
          'revision' => 3,
          'resolvedAt' => 800,
          'sourceHash' => '0' * 64,
          _ => 'other',
        };
        expect(
          () => change.requireResult(checkpointResult(wire)),
          throwsFormatException,
        );
      }
      final wire = checkpointCopy(requestAppliedWire(change));
      (checkpointBody(wire)['report']! as Map)['reportedBy'] = 'other';
      expect(
        () => change.requireResult(checkpointResult(wire)),
        throwsFormatException,
      );
    },
  );
  test(
    'replays preserve later ownership and closeout decisions without repeating them',
    () {
      final original = requestChange(decision: reassignReporter);
      final later = requestAppliedWire(original);
      later['outcome'] = 'replayed';
      final assignment = checkpointBody(later)['assignment']! as Map;
      assignment['revision'] = 2;
      (assignment['change']! as Map).addAll(<String, Object>{
        'revision': 2,
        'responsibleOperatorId': 'later',
        'previousResponsibleOperatorId': 'sweep-2',
        'assignedBy': 'another-manager',
        'reason': 'Later shift',
      });
      (checkpointBody(later)['request']! as Map)['responsibleOperatorId'] =
          'later';
      original.requireResult(checkpointResult(later));
      final replaced = checkpointCopy(later);
      (checkpointBody(replaced)['report']! as Map)['reportId'] =
          'checkpoint:${'0' * 64}';
      expect(
        () => original.requireResult(checkpointResult(replaced)),
        throwsFormatException,
      );
      final close = requestChange();
      final reopen = requestChange(
        wire: requestAppliedWire(close),
        decision: ReopenCheckpointRequest('Review again'),
      );
      final reopened = requestAppliedWire(
        reopen,
        before: requestAppliedWire(close),
      );
      reopened['outcome'] = 'replayed';
      reopened['operationRevision'] = 1;
      close.requireResult(checkpointResult(reopened));
    },
  );
}
