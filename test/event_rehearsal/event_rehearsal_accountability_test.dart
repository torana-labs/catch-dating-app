import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_rehearsal_accountability_fixtures.dart';
import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  EventRehearsalBootstrap read(Object? wire) =>
      EventRehearsalBootstrap.fromCallableData(wire);

  test('canonical reviews use backend clock and episode identities', () {
    final wire = practiceVisitBootstrap();
    final validator = JsonSchema.create(
      contractSchema('EventRehearsalBootstrapCallableResponse'),
    );
    expect(validator.validate(wire).isValid, isTrue);
    final reviews = read(wire).accountabilityReviews!;
    expect(reviews.clockId, practiceVisitClock);
    expect(reviews.rows.map((r) => r.scope.episodeId), practiceVisitEpisodes);
    expect(
      reviews.rows.every((r) => r is RehearsalActionableAccountability),
      isTrue,
    );
    expect(reviews.rows.first.evidence.checkedInAtMillis, 500);
    expect(read(practiceBootstrap()).accountabilityReviews, isNull);
    expect(
      practiceVisitSnapshot().accountabilityReviews!.rows.first.scope,
      reviews.rows.first.scope,
    );
    visitRows(wire).first['sourceHash'] = 'f' * 64;
    expect(reviews.rows.first.evidence.sourceHash, 'a' * 64);
    expect(() => reviews.rows.clear(), throwsUnsupportedError);
  });

  for (final reason in RehearsalVisitUnavailableReason.values) {
    test('${reason.name} is distinct from an unresolved current visit', () {
      final wire = practiceVisitBootstrap();
      final rows = visitRows(wire);
      final actors = wire['actors']! as List;
      for (var i = 0; i < rows.length; i++) {
        rows[i]['availability'] = {
          'kind': 'unavailable',
          'reason': reason.name,
        };
        rows[i]['canResolve'] = false;
        switch (reason) {
          case RehearsalVisitUnavailableReason.notApplicable:
            ((wire['session']! as Map)['setup'] as Map)['moduleIds'] = [
              'arrival',
            ];
          case RehearsalVisitUnavailableReason.notCheckedIn:
            rows[i]['visitRevision'] = 0;
            rows[i]['checkedInAtMillis'] = null;
            (actors[i] as Map)['status'] = 'expected';
          case RehearsalVisitUnavailableReason.visitNotRecorded:
            rows[i]['visitRevision'] = null;
            rows[i]['checkedInAtMillis'] = null;
          case RehearsalVisitUnavailableReason.invalidSource:
            (actors[i] as Map)['status'] = 'disconnected';
        }
      }
      final row = read(wire).accountabilityReviews!.rows.first;
      expect(row, isA<RehearsalObservedAccountability>());
      expect(
        (row.evidence.availability as RehearsalVisitUnavailable).reason,
        reason,
      );
      expect(row.evidence.disposition, AssistanceVisitDisposition.unresolved);
    });
  }

  test(
    'session state and capacity control actions without erasing evidence',
    () {
      for (final status in EventRehearsalStatus.values) {
        final wire = practiceVisitBootstrap();
        (wire['session']! as Map)['status'] = status.name;
        final actionable = [
          EventRehearsalStatus.running,
          EventRehearsalStatus.paused,
          EventRehearsalStatus.complete,
        ].contains(status);
        for (final row in visitRows(wire)) {
          row['canResolve'] = actionable;
        }
        final row = read(wire).accountabilityReviews!.rows.first;
        expect(row is RehearsalActionableAccountability, actionable);
        expect(row.evidence.availability, isA<RehearsalVisitReady>());
      }
      for (final cap in ['actionCount', 'revision']) {
        final wire = practiceVisitBootstrap();
        if (cap == 'actionCount') {
          (wire['session']! as Map)['actionCount'] = 500;
        }
        for (final row in visitRows(wire)) {
          if (cap == 'revision') row['revision'] = 9007199254740991;
          row['canResolve'] = false;
        }
        expect(
          read(wire).accountabilityReviews!.rows.first,
          isA<RehearsalObservedAccountability>(),
        );
      }
    },
  );

  test(
    'malformed scope, numeric fences and incomplete coverage fail closed',
    () {
      for (final mutate in <void Function(Map<String, Object?>)>[
        (w) => w['accountabilityReviews'] = null,
        (w) => (w['accountabilityReviews']! as Map)['clockId'] =
            'clock:${'f' * 64}',
        (w) => (w['accountabilityReviews']! as Map)['coverage'] = 'page',
        (w) => (w['accountabilityReviews']! as Map)['rows'] = [],
        (w) => ((w['accountabilityReviews']! as Map)['rows'] as List)[1] =
            visitRows(w).first,
        (w) => (w['actors']! as List).removeLast(),
        (w) => (w['session']! as Map)['actorCount'] = 51,
        (w) => (w['session']! as Map)['setupRevision'] = 1.5,
        (w) => (w['session']! as Map)['runtimeRevision'] = 4.5,
        (w) => (w['session']! as Map)['actionCount'] = 501,
        (w) => (w['session']! as Map)['virtualStartedAtMillis'] = null,
        (w) => (w['session']! as Map)['virtualNowMillis'] = 1000.5,
        (w) => visitRows(w).first['episodeId'] = practiceVisitEpisodes[1],
        (w) => visitRows(w).first['attendeeId'] = 'foreign',
        (w) => visitRows(w).first['resolvedBy'] = 'private-host',
        (w) => visitRows(w).first['sourceHash'] = 'not-a-hash',
        (w) => visitRows(w).first['revision'] = -1,
        (w) => visitRows(w).first['revision'] = double.infinity,
        (w) => visitRows(w).first['visitRevision'] = 1.5,
        (w) => visitRows(w).first['checkedInAtMillis'] = 1001,
        (w) => visitRows(w).first['checkedInAtMillis'] = null,
        (w) => visitRows(w).first['disposition'] = 'returned',
        (w) => visitRows(w).first['canResolve'] = false,
        (w) => visitRows(w).first['availability'] = {
          'kind': 'unavailable',
          'reason': 'unknown',
        },
        (w) => ((w['actors']! as List).first as Map)['status'] = 'walkIn',
      ]) {
        final wire = practiceVisitBootstrap();
        mutate(wire);
        expect(() => read(wire), throwsFormatException);
      }
    },
  );

  for (final disposition in AssistanceVisitDisposition.values) {
    test(
      '${disposition.name} uses the canonical command and confirms its exact visit',
      () {
        final change = practiceVisitChange(disposition: disposition);
        final validator = JsonSchema.create(
          contractSchema('ControlEventRehearsalCallablePayload'),
        );
        expect(validator.validate(change.toJson()).isValid, isTrue);
        expect(change.command.toJson(), {
          'kind': 'resolveAccountability',
          'actorId': 'actor-01',
          'expectedSourceHash': 'a' * 64,
          'payload': {
            'attendeeId': 'actor-01',
            'episodeId': practiceVisitEpisodes.first,
            'disposition': disposition.name,
          },
        });
        final result = read(practiceVisitResult(change));
        change.requireResult(result);
        expect(
          result.accountabilityReviews!.rows.first.evidence.disposition,
          disposition,
        );
        expect(
          (change.toJson()['assistance']! as Map).containsKey('context'),
          isFalse,
        );
        expect(
          () => RehearsalAssistanceChange(
            snapshot: practiceVisitSnapshot(),
            command: change.command,
            clientActionId: 'foreign-review',
          ),
          throwsFormatException,
        );
      },
    );
  }

  test(
    'immediate results cannot change visits, time, receipts or the decision',
    () {
      final change = practiceVisitChange();
      for (final mutate in <void Function(Map<String, Object?>)>[
        (w) => w.remove('accountabilityReviews'),
        (w) => w['actions'] = [],
        (w) => (w['actions']! as List).add((w['actions']! as List).first),
        (w) => ((w['actions']! as List).first as Map)['virtualNowMillis'] = 999,
        (w) => (w['session']! as Map)['setupRevision'] = 2,
        (w) => (w['session']! as Map)['organizerId'] = 'other',
        (w) => (w['session']! as Map)['actionCount'] = 1,
        (w) => (w['session']! as Map)['virtualNowMillis'] = 1001,
        (w) => visitRows(w).first['revision'] = 2,
        (w) => visitRows(w).first['visitRevision'] = 3,
        (w) => visitRows(w).first['checkedInAtMillis'] = 600,
        (w) => visitRows(w).first['sourceHash'] = 'a' * 64,
        (w) => visitRows(w).first['disposition'] = 'departed',
      ]) {
        final wire = practiceVisitResult(change);
        mutate(wire);
        expect(() => change.requireResult(read(wire)), throwsFormatException);
      }
    },
  );

  test('replays retain a subsequent visit, departure or correction', () {
    final change = practiceVisitChange();
    final rejoined = read(
      practiceVisitResult(change, laterActions: 2, rejoined: true),
    );
    change.requireResult(rejoined);
    expect(
      rejoined.accountabilityReviews!.rows.first.evidence.disposition,
      AssistanceVisitDisposition.unresolved,
    );
    final corrected = practiceVisitResult(change, laterActions: 1);
    visitRows(
      corrected,
    ).first.addAll({'revision': 2, 'disposition': 'departed'});
    change.requireResult(read(corrected));
    final left = practiceVisitResult(change, laterActions: 1);
    visitRows(left).first.addAll({
      'visitRevision': 2,
      'checkedInAtMillis': null,
      'disposition': 'unresolved',
      'availability': {'kind': 'unavailable', 'reason': 'notCheckedIn'},
      'canResolve': false,
    });
    ((left['actors']! as List).first as Map)['status'] = 'departed';
    change.requireResult(read(left));
    visitRows(left).first['revision'] = 0;
    expect(() => change.requireResult(read(left)), throwsFormatException);
  });

  test(
    'completed rehearsals can use the last available action for closeout',
    () {
      final wire = practiceVisitBootstrap(actionCount: 499);
      (wire['session']! as Map)['status'] = 'complete';
      final change = practiceVisitChange(snapshot: read(wire));
      final result = read(practiceVisitResult(change));
      change.requireResult(result);
      expect(
        result.accountabilityReviews!.rows.first,
        isA<RehearsalObservedAccountability>(),
      );
      expect(result.session.actionCount, 500);
    },
  );
}
