import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_checkpoint_visit_fixtures.dart';
import 'event_assistance_accountability_fixtures.dart';
import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_fixtures.dart';
import 'event_assistance_checkpoint_request_widget_fixtures.dart';

class CheckpointVisitUiPractice extends CheckpointRequestUiPractice {
  CheckpointVisitUiPractice() {
    wire = checkpointVisitBootstrap('initial');
  }
  @override
  void confirm(String sample) {
    wire = checkpointVisitResult(writes.last.change, sample);
    writes.last.result.complete(snapshot);
  }
}

class CheckpointVisitUiLive extends CheckpointRequestUiLive {
  CheckpointVisitUiLive() {
    update(false);
  }
  bool visitChanged = false;
  void replaceVisit() {
    visitChanged = true;
    update(false);
    final members =
        ((checkpointBody(wire)['availability'] as Map)['members'] as List)
            .cast<Map>();
    members[1]['displayName'] = null;
    members[1]['visit'] = {'kind': 'unavailable', 'reason': 'visitChanged'};
    members[1]['disposition'] = {
      'kind': 'unavailable',
      'reason': 'visitChanged',
    };
  }

  void update(bool resolved) {
    wire = checkpointCopy(requestReadyWire());
    final body = checkpointBody(wire);
    final members = ((body['availability'] as Map)['members'] as List)
        .cast<Map>();
    members[0]['displayName'] = 'Alex Morgan';
    members[1]['displayName'] = 'Priya Sharma';
    if (!resolved) {
      members[1]['disposition'] = {'kind': 'unresolved'};
      (body['closeout'] as Map)['eligibility'] = {
        'kind': 'unavailable',
        'reason': 'unresolvedMembers',
        'attendeeIds': ['b'],
      };
    }
  }
}

class CheckpointVisitUiAccountability extends Fake
    implements EventAssistanceAccountabilityRepository {
  CheckpointVisitUiAccountability(this.checkpoint);
  final CheckpointVisitUiLive checkpoint;
  final scopes = <EventAssistanceAccountabilityScope>[];
  final writes =
      <
        ({
          EventAssistanceAccountabilityChange change,
          Completer<EventAssistanceAccountabilityResult> result,
        })
      >[];
  @override
  Future<EventAssistanceAccountabilityView> fetch(
    EventAssistanceAccountabilityScope scope,
  ) async {
    scopes.add(scope);
    expect(scope.checkpoint, checkpointScope.checkpoint);
    expect(scope.attendeeId, 'b');
    return accountabilityView(
      scope: scope,
      reason: checkpoint.visitChanged ? 'visitChanged' : null,
    );
  }

  @override
  Future<EventAssistanceAccountabilityResult> apply(
    EventAssistanceAccountabilityChange change,
  ) {
    final result = Completer<EventAssistanceAccountabilityResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    if (!checkpoint.visitChanged) checkpoint.update(true);
    final change = writes.last.change;
    final wire = accountabilityAppliedWire(change);
    if (checkpoint.visitChanged) {
      wire['outcome'] = 'replayed';
      (wire['view'] as Map)['availability'] = {
        'kind': 'unavailable',
        'reason': 'visitChanged',
      };
      (wire['view'] as Map)['disposition'] = 'unresolved';
    }
    writes.last.result.complete(
      accountabilityResult(wire, scope: change.snapshot.scope),
    );
  }
}
