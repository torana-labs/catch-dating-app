import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_checkpoint_visit_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  test(
    'a recorded checkpoint enables visit resolution without the general sweep',
    () {
      final view = checkpointVisitReview('withoutSweep');
      expect(
        view.session.setup.modules,
        isNot(contains(EventRehearsalModule.accountability)),
      );
      final visit = view.checkpoint!.accountabilityReviews.value!.last;
      expect(visit.canResolve, isTrue);
      expect(
        RehearsalResolveCheckpointVisit(
          snapshot: view,
          visit: visit,
          disposition: AssistanceVisitDisposition.departed,
        ).selectedRevision,
        1,
      );
    },
  );
  test(
    'scoped visit command preserves departure and confirms actual backend result',
    () {
      final view = checkpointVisitReview('initial');
      final visit = view.checkpoint!.accountabilityReviews.value!.last;
      final change = RehearsalMovementChange(
        command: RehearsalResolveCheckpointVisit(
          snapshot: view,
          visit: visit,
          disposition: AssistanceVisitDisposition.departed,
        ),
        clientActionId: 'checkpoint_visit_fixture',
      );
      final payload = (change.command.toJson()['payload']! as Map);
      expect(payload['attendeeId'], visit.attendeeId);
      expect(payload['checkpointId'], view.checkpoint!.checkpointId);
      expect(
        payload['expectedProgressRevision'],
        view.checkpoint!.progressRevision,
      );
      expect(payload['expectedAccountabilityRevision'], visit.revision);
      final result = EventRehearsalBootstrap.fromCallableData(
        checkpointVisitResult(change, 'resolved'),
      );
      change.requireResult(result);
      expect(result.movementReview!.checkpoint!.report!.accountedFor, [
        'actor-01',
      ]);
      expect(
        result
            .movementReview!
            .checkpoint!
            .accountabilityReviews
            .value!
            .last
            .disposition,
        AssistanceVisitDisposition.departed,
      );
    },
  );
  test('a later replay preserves corrections and a changed visit', () {
    final view = checkpointVisitReview('initial');
    final change = RehearsalMovementChange(
      command: RehearsalResolveCheckpointVisit(
        snapshot: view,
        visit: view.checkpoint!.accountabilityReviews.value!.last,
        disposition: AssistanceVisitDisposition.departed,
      ),
      clientActionId: 'checkpoint_visit_fixture',
    );
    for (final sample in ['unresolved', 'newVisit']) {
      final result = EventRehearsalBootstrap.fromCallableData(
        checkpointVisitResult(change, sample),
      );
      change.requireResult(result);
      expect(
        result
            .movementReview!
            .checkpoint!
            .accountabilityReviews
            .value!
            .last
            .disposition,
        AssistanceVisitDisposition.unresolved,
      );
    }
  });
  test('new visits cannot inherit original roster authority', () {
    final view = checkpointVisitReview('newVisit');
    final visit = view.checkpoint!.accountabilityReviews.value!.last;
    expect(visit.canResolve, isFalse);
    expect(visit.availability, isA<AssistanceAccountabilityUnavailable>());
    expect(
      () => RehearsalResolveCheckpointVisit(
        snapshot: view,
        visit: visit,
        disposition: AssistanceVisitDisposition.returned,
      ),
      throwsFormatException,
    );
  });
  test(
    'forged permission, reordered identities and changed visit proof are rejected',
    () {
      for (final corrupt in ['permission', 'id', 'visitHash']) {
        final wire = checkpointVisitBootstrap('initial');
        final row =
            (movementObjectAt(wire, [
                          'movementReview',
                          'checkpoint',
                        ])['accountabilityReviews']
                        as List)
                    .last
                as Map;
        if (corrupt == 'permission') row['canResolve'] = false;
        if (corrupt == 'id') row['attendeeId'] = 'actor-01';
        if (corrupt == 'visitHash') row['visitHash'] = 'f' * 64;
        expect(
          () => EventRehearsalBootstrap.fromCallableData(wire),
          throwsFormatException,
        );
      }
    },
  );
  test(
    'missing legacy projection stays unknown and a foreign review cannot create a command',
    () {
      final wire = checkpointVisitBootstrap('initial');
      movementObjectAt(wire, [
        'movementReview',
        'checkpoint',
      ]).remove('accountabilityReviews');
      final old = EventRehearsalBootstrap.fromCallableData(
        wire,
      ).movementReview!;
      expect(old.checkpoint!.accountabilityReviews.isProvided, isFalse);
      final row = checkpointVisitReview(
        'initial',
      ).checkpoint!.accountabilityReviews.value!.last;
      expect(
        () => RehearsalResolveCheckpointVisit(
          snapshot: old,
          visit: row,
          disposition: AssistanceVisitDisposition.returned,
        ),
        throwsFormatException,
      );
    },
  );
  test('an immediate receipt must confirm the chosen disposition', () {
    final view = checkpointVisitReview('initial');
    final wrong = RehearsalMovementChange(
      command: RehearsalResolveCheckpointVisit(
        snapshot: view,
        visit: view.checkpoint!.accountabilityReviews.value!.last,
        disposition: AssistanceVisitDisposition.returned,
      ),
      clientActionId: 'checkpoint_visit_fixture',
    );
    final result = EventRehearsalBootstrap.fromCallableData(
      checkpointVisitResult(wrong, 'resolved'),
    );
    expect(() => wrong.requireResult(result), throwsFormatException);
  });
}
