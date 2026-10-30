import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/control_event_rehearsal_callable_payload.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_rehearsal_checkpoint_management_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  final cases = [
    (
      before: 'departed',
      after: 'reassigned',
      decision: ReassignCheckpointReporter(
        reporterId: 'host-1',
        reason: '  Taking over the report.  ',
      ),
    ),
    (
      before: 'resolved',
      after: 'closed',
      decision: CloseCheckpointRequest('Reviewed every outstanding guest.'),
    ),
    (
      before: 'needsReview',
      after: 'reopened',
      decision: ReopenCheckpointRequest('Reviewed every outstanding guest.'),
    ),
  ];
  for (final c in cases) {
    test(
      '${c.after} uses canonical payloads and preserves exact receipt evidence',
      () {
        final command = RehearsalManageCheckpoint(
          snapshot: managementReview(c.before),
          decision: c.decision,
        );
        final change = RehearsalMovementChange(
          command: command,
          clientActionId: 'management_test_1',
        );
        expect(
          JsonSchema.create(
            schemaControlEventRehearsalCallablePayloadSchema,
          ).validate(change.toJson()).isValid,
          isTrue,
        );
        final result = managementResult(change, c.after);
        expect(
          () => change.requireResult(
            EventRehearsalBootstrap.fromCallableData(result),
          ),
          returnsNormally,
        );
        movementObjectAt(result, ['actions', 0])['name'] =
            'movement:recordCheckpoint';
        expect(
          () => change.requireResult(
            EventRehearsalBootstrap.fromCallableData(result),
          ),
          throwsFormatException,
        );
      },
    );
  }
  test('late retries retain subsequent reports and closeout corrections', () {
    for (final c in cases.take(2)) {
      final change = RehearsalMovementChange(
        clientActionId: 'management_test_2',
        command: RehearsalManageCheckpoint(
          snapshot: managementReview(c.before),
          decision: c.decision,
        ),
      );
      final result = EventRehearsalBootstrap.fromCallableData(
        managementResult(change, 'complete'),
      );
      expect(() => change.requireResult(result), returnsNormally);
      expect(result.movementReview!.checkpoint!.report!.accountedFor.length, 2);
    }
  });
  test(
    'complete, unreported, unresolved and identical-owner actions are withheld',
    () {
      for (final decision in [
        CloseCheckpointRequest('Reviewed'),
        ReopenCheckpointRequest('Review again'),
        ReassignCheckpointReporter(reporterId: 'host-2', reason: 'Taking over'),
      ]) {
        expect(
          () => RehearsalManageCheckpoint(
            snapshot: managementReview('complete'),
            decision: decision,
          ),
          throwsFormatException,
        );
      }
      for (final name in ['departed', 'partial']) {
        expect(
          () => RehearsalManageCheckpoint(
            snapshot: managementReview(name),
            decision: CloseCheckpointRequest('Reviewed'),
          ),
          throwsFormatException,
        );
      }
      expect(
        () => RehearsalManageCheckpoint(
          snapshot: managementReview('reassigned'),
          decision: ReassignCheckpointReporter(
            reporterId: 'host-1',
            reason: 'Same owner',
          ),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'management cannot silently correct an arrival report in its response',
    () {
      final change = RehearsalMovementChange(
        clientActionId: 'management_test_3',
        command: RehearsalManageCheckpoint(
          snapshot: managementReview('resolved'),
          decision: CloseCheckpointRequest('Reviewed every outstanding guest.'),
        ),
      );
      final result = managementResult(change, 'closed');
      for (final path in [
        ['movementReview', 'selected', 'report'],
        ['movementReview', 'progress', 'current', 'report'],
        ['movementReview', 'checkpoint', 'report'],
        ['movementReview', 'selected', 'closeout', 'decision', 'report'],
        [
          'movementReview',
          'progress',
          'current',
          'closeout',
          'decision',
          'report',
        ],
        [
          'movementReview',
          'checkpoint',
          'closeout',
          'change',
          'decision',
          'report',
        ],
      ]) {
        movementObjectAt(result, path)['correctionReason'] = 'Silently altered';
      }
      final parsed = EventRehearsalBootstrap.fromCallableData(result);
      expect(() => change.requireResult(parsed), throwsFormatException);
    },
  );
}
