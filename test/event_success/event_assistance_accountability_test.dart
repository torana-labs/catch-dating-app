import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/resolve_event_assistance_accountability_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_accountability_fixtures.dart';

void main() {
  Map<String, Object?> body(Map<String, Object?> wire) =>
      wire['view']! as Map<String, Object?>;
  final responseSchema = JsonSchema.create(
    schemas
        .schemaContractsByName['EventAssistanceAccountabilityCallableResponse']!,
  );
  final commandSchema = JsonSchema.create(
    schemas
        .schemaContractsByName['ResolveEventAssistanceAccountabilityCallablePayload']!,
  );

  test(
    'all canonical dispositions, outcomes and unavailable reasons have native coverage',
    () {
      final properties =
          schemas.schemaContractsByName['EventAssistanceAccountabilityCallableResponse']!['properties']!
              as Map;
      final view = (properties['view']! as Map)['properties']! as Map;
      expect(
        ((view['disposition']! as Map)['enum']! as List).toSet(),
        AssistanceVisitDisposition.values.map((v) => v.name).toSet(),
      );
      expect(
        ((properties['outcome']! as Map)['enum']! as List).toSet(),
        AssistanceAccountabilityOutcome.values.map((v) => v.name).toSet(),
      );
      final variants = (view['availability']! as Map)['oneOf']! as List;
      expect(
        variants
            .map(
              (v) =>
                  (((v as Map)['properties']! as Map)['kind']! as Map)['const'],
            )
            .toSet(),
        {'ready', 'unavailable'},
      );
      final blocked = variants.cast<Map>().singleWhere(
        (v) => (v['properties']! as Map).containsKey('reason'),
      );
      expect(
        (((blocked['properties']! as Map)['reason']! as Map)['enum']! as List)
            .toSet(),
        AssistanceAccountabilityUnavailableReason.values
            .map((v) => v.name)
            .toSet(),
      );
    },
  );

  test(
    'a physical visit can be reviewed and corrected without an assistance episode',
    () {
      for (final scope in [
        accountabilityScope,
        checkpointAccountabilityScope,
      ]) {
        for (final disposition in AssistanceVisitDisposition.values) {
          final view = accountabilityView(
            scope: scope,
            episodeId: null,
            disposition: 'returned',
            revision: 3,
          );
          final change = accountabilityChange(
            view: view,
            disposition: disposition,
          );
          final payload = ResolveEventAssistanceAccountabilityCallableRequest(
            groupId: scope.group.groupId,
            command: change.command,
            expectedSourceHash: view.sourceHash,
            checkpoint: scope.checkpoint?.toJson(),
          ).toJson();
          expect(commandSchema.validate(payload).isValid, isTrue);
          expect((change.command['payload']! as Map)['episodeId'], isNull);
          expect(payload.containsKey('checkpoint'), scope.checkpoint != null);
          final wire = accountabilityAppliedWire(change);
          expect(responseSchema.validate(wire).isValid, isTrue);
          final result = accountabilityResult(wire, scope: scope);
          change.requireResult(result);
          expect(result.view.disposition, disposition);
        }
      }
    },
  );

  test('each unavailable reason remains visible and prevents a command', () {
    for (final reason in AssistanceAccountabilityUnavailableReason.values) {
      final scope =
          reason == AssistanceAccountabilityUnavailableReason.notApplicable
          ? accountabilityScope
          : checkpointAccountabilityScope;
      final wire = accountabilityWire(scope: scope, reason: reason.name);
      expect(responseSchema.validate(wire).isValid, isTrue);
      final view = accountabilityResult(wire, scope: scope).view;
      expect(view.canResolve, isFalse);
      expect(
        (view.availability as AssistanceAccountabilityUnavailable).reason,
        reason,
      );
      expect(() => accountabilityChange(view: view), throwsFormatException);
    }
  });

  test(
    'scope identity shares a guest across groups and distinguishes departure reviews',
    () {
      final other = EventAssistanceAccountabilityScope(
        group: EventAssistanceGroupScope(
          organizerId: 'org-1',
          eventId: 'event-1',
          groupId: 'easy',
        ),
        attendeeId: 'guest-1',
        checkpoint: AssistanceAccountabilityCheckpoint(
          checkpointId: 'stop-1',
          progressRevision: 2,
        ),
      );
      expect(other.guest, accountabilityScope.guest);
      expect(other, isNot(checkpointAccountabilityScope));
      final same = EventAssistanceAccountabilityScope(
        group: accountabilityGroup,
        attendeeId: 'guest-1',
        checkpoint: AssistanceAccountabilityCheckpoint(
          checkpointId: 'stop-1',
          progressRevision: 2,
        ),
      );
      expect(same, checkpointAccountabilityScope);
      expect(same.hashCode, checkpointAccountabilityScope.hashCode);
      expect(
        () => AssistanceAccountabilityCheckpoint(
          checkpointId: 'stop-1',
          progressRevision: 0,
        ),
        throwsFormatException,
      );
    },
  );

  test(
    'malformed and mismatched read data never becomes an actionable review',
    () {
      final mutations = <void Function(Map<String, Object?>)>[
        (v) => v['attendeeId'] = 'other',
        (v) => v['groupId'] = 'other',
        (v) => v['context'] = {
          ...accountabilityGroup.context,
          'mode': 'rehearsal',
        },
        (v) => v['sourceHash'] = 'invalid',
        (v) => v['revision'] = 1.5,
        (v) => v.remove('episodeId'),
        (v) => v['episodeId'] = '',
        (v) => v['disposition'] = 'checkedIn',
        (v) => v['extra'] = true,
        (v) => v['availability'] = {'kind': 'ready', 'reason': 'notCheckedIn'},
        (v) => v['availability'] = {
          'kind': 'unavailable',
          'reason': 'notOnDeparture',
        },
        (v) => v['availability'] = {'kind': 'unknown'},
        (v) => v['checkpoint'] = null,
      ];
      for (final mutate in mutations) {
        final wire = accountabilityWire();
        mutate(body(wire));
        expect(() => accountabilityResult(wire), throwsFormatException);
      }
      final unchecked = accountabilityWire(
        reason: 'notCheckedIn',
        disposition: 'returned',
      );
      expect(() => accountabilityResult(unchecked), throwsFormatException);
    },
  );

  test(
    'checkpoint review requires the exact original stop and departure revision',
    () {
      final mutations = <void Function(Map<String, Object?>)>[
        (v) => v.remove('checkpoint'),
        (v) => v['checkpoint'] = null,
        (v) => (v['checkpoint']! as Map)['progressRevision'] = 3,
        (v) => (v['checkpoint']! as Map)['checkpointId'] = 'stop-2',
        (v) => v['availability'] = {
          'kind': 'unavailable',
          'reason': 'notApplicable',
        },
      ];
      for (final mutate in mutations) {
        final wire = accountabilityWire(scope: checkpointAccountabilityScope);
        mutate(body(wire));
        expect(
          () =>
              accountabilityResult(wire, scope: checkpointAccountabilityScope),
          throwsFormatException,
        );
      }
    },
  );

  test('applied confirmation binds the operation, visit and chosen result', () {
    final change = accountabilityChange(view: accountabilityView(revision: 4));
    final mutations = <void Function(Map<String, Object?>)>[
      (w) => w['operationRevision'] = 4,
      (w) => w['operationRevision'] = null,
      (w) => body(w)['revision'] = 6,
      (w) => body(w)['episodeId'] = null,
      (w) => body(w)['serverTime'] = 999,
      (w) => body(w)['disposition'] = 'departed',
      (w) => body(w)['availability'] = {
        'kind': 'unavailable',
        'reason': 'notApplicable',
      },
    ];
    for (final mutate in mutations) {
      final wire = accountabilityAppliedWire(change);
      mutate(wire);
      expect(
        () => change.requireResult(accountabilityResult(wire)),
        throwsFormatException,
      );
    }
    expect(
      () => change.requireResult(accountabilityResult(accountabilityWire())),
      throwsFormatException,
    );
  });

  test(
    'replay preserves later corrections without restoring the old disposition',
    () {
      final change = accountabilityChange();
      final wire = accountabilityWire(disposition: 'departed', revision: 6)
        ..addAll({'outcome': 'replayed', 'operationRevision': 1});
      body(wire).addAll({'serverTime': 3000, 'sourceHash': 'b' * 64});
      final replay = accountabilityResult(wire);
      change.requireResult(replay);
      expect(replay.view.disposition, AssistanceVisitDisposition.departed);
      expect(replay.operationRevision, 1);
      body(wire)['episodeId'] = 'new-visit';
      expect(
        () => change.requireResult(accountabilityResult(wire)),
        throwsFormatException,
      );
    },
  );
}
