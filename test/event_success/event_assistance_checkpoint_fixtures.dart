import 'dart:convert';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';

final checkpointGroup = EventAssistanceGroupScope(
  organizerId: 'org-1',
  eventId: 'event-1',
  groupId: 'event:whole',
);
final checkpointScope = EventAssistanceCheckpointScope(
  group: checkpointGroup,
  checkpoint: AssistanceAccountabilityCheckpoint(
    checkpointId: 'stop-1',
    progressRevision: 2,
  ),
);
final checkpointRosterId = 'departure-roster:${'2' * 64}';
final checkpointReportId = 'checkpoint:${'1' * 64}';
final checkpointRosterHash = '3' * 64;
final observedA = AssistanceCheckpointObservation(['a']);
final observedBoth = AssistanceCheckpointObservation(['a', 'b']);
Map<String, Object?> checkpointBody(Map<String, Object?> wire) =>
    wire['view']! as Map<String, Object?>;
Map<String, Object?> checkpointCopy(Map<String, Object?> wire) =>
    (jsonDecode(jsonEncode(wire)) as Map).cast<String, Object?>();

Map<String, Object?> checkpointWire({
  EventAssistanceCheckpointScope? scope,
  List<String> ids = const ['a', 'b'],
  List<String>? observed,
  String? reason,
  Map<String, String> unavailableVisits = const {},
  String? requestState,
  int dueAt = 1500,
}) {
  final selected = scope ?? checkpointScope;
  final report = observed == null
      ? null
      : <String, Object?>{
          'schemaVersion': 1,
          'reportId': checkpointReportId,
          'context': selected.group.context,
          'groupId': selected.group.groupId,
          'checkpointId': selected.checkpointId,
          'progressRevision': selected.progressRevision,
          'rosterId': checkpointRosterId,
          'rosterHash': checkpointRosterHash,
          'revision': 1,
          'accountedFor': observed.toList()..sort(),
          'reportedBy': 'host-1',
          'reportedAt': 500,
          'createdAt': 400,
          'correctionReason': null,
        };
  final status = report == null
      ? 'unreported'
      : observed!.length == ids.length
      ? 'complete'
      : 'partial';
  return {
    'outcome': 'read',
    'operationRevision': null,
    'view': {
      'context': selected.group.context,
      'groupId': selected.group.groupId,
      'checkpointId': selected.checkpointId,
      'progressRevision': selected.progressRevision,
      'serverTime': 1000,
      'sourceHash': 'a' * 64,
      'revision': report == null ? 0 : 1,
      'report': report,
      'availability': reason != null
          ? {'kind': 'unavailable', 'reason': reason}
          : {
              'kind': 'ready',
              'rosterId': checkpointRosterId,
              'label': 'First stop',
              'reportStatus': status,
              'members': [
                for (final id in ids)
                  {
                    'attendeeId': id,
                    'observation': observed?.contains(id) == true
                        ? 'accountedFor'
                        : 'unconfirmed',
                    'visit': unavailableVisits.containsKey(id)
                        ? {
                            'kind': 'unavailable',
                            'reason': unavailableVisits[id],
                          }
                        : {'kind': 'current'},
                    'disposition': unavailableVisits.containsKey(id)
                        ? {
                            'kind': 'unavailable',
                            'reason': unavailableVisits[id],
                          }
                        : {'kind': 'unresolved'},
                  },
              ],
            },
      'request': requestState == null
          ? null
          : {
              'responsibleOperatorId': 'pacer-1',
              'dueAt': dueAt,
              'state': requestState,
              'ownerAvailability':
                  requestState == 'complete' || requestState == 'closedOut'
                  ? 'notRequired'
                  : 'current',
            },
      'assignment': null,
      'closeout': null,
    },
  };
}

EventAssistanceCheckpointResult checkpointResult(
  Map<String, Object?> wire, {
  EventAssistanceCheckpointScope? scope,
}) => EventAssistanceCheckpointResult.fromCallableData(
  wire,
  expectedScope: scope ?? checkpointScope,
);
EventAssistanceCheckpointView checkpointView({
  List<String>? observed,
  String? reason,
}) => checkpointResult(checkpointWire(observed: observed, reason: reason)).view;
EventAssistanceCheckpointChange checkpointChange({
  EventAssistanceCheckpointView? view,
  AssistanceCheckpointObservation? decision,
}) => EventAssistanceCheckpointChange(
  snapshot: view ?? checkpointView(),
  decision: decision ?? observedA,
  actorUid: 'host-1',
  operationId: 'checkpoint-1',
);
Map<String, Object?> checkpointAppliedWire(
  EventAssistanceCheckpointChange change,
) {
  final before = change.snapshot;
  final roster = before.availability as AssistanceCheckpointRoster;
  final wire = checkpointWire(
    scope: before.scope,
    ids: roster.members.map((m) => m.attendeeId).toList(),
    observed: change.decision.accountedFor,
    unavailableVisits: {
      for (final m in roster.members)
        if (m.visit case AssistanceCheckpointUnavailableVisit(:final reason))
          m.attendeeId: reason.name,
    },
  );
  wire.addAll({'outcome': 'applied', 'operationRevision': before.revision + 1});
  final body = checkpointBody(wire);
  body.addAll({
    'serverTime': 2000,
    'sourceHash': 'b' * 64,
    'revision': before.revision + 1,
  });
  (body['report']! as Map<String, Object?>).addAll({
    'revision': before.revision + 1,
    'reportedAt': 2000,
    'createdAt': before.report?.createdAt ?? 2000,
    'reportedBy': change.actorUid,
    'correctionReason': change.decision.correctionReason,
  });
  return wire;
}

Map<String, Object?> checkpointResolvedWire() => {
  'kind': 'resolved',
  'disposition': 'departed',
  'revision': 2,
  'resolvedAt': 700,
  'resolvedBy': 'host-1',
  'sourceHash': '8' * 64,
};
Map<String, Object?> checkpointClosedWire() {
  final wire = checkpointWire(observed: ['a'], requestState: 'closedOut');
  final body = checkpointBody(wire);
  final members = ((body['availability']! as Map)['members']! as List)
      .cast<Map>();
  members[1]['disposition'] = checkpointResolvedWire();
  body['assignment'] = {'revision': 0, 'sourceHash': '7' * 64, 'change': null};
  body['closeout'] = {
    'revision': 1,
    'sourceHash': '9' * 64,
    'change': {
      'revision': 1,
      'previousRevision': 0,
      'receiptId': 'checkpoint-closeout:${'4' * 64}',
      'changedBy': 'host-1',
      'changedAt': 900,
      'reason': 'Guest left early',
      'decision': {
        'kind': 'close',
        'report': checkpointCopy(body['report']! as Map<String, Object?>),
        'dispositions': [
          {'attendeeId': 'b', ...checkpointResolvedWire()},
        ],
      },
    },
    'state': {'kind': 'closedOut'},
    'eligibility': {
      'kind': 'unavailable',
      'reason': 'alreadyClosed',
      'attendeeIds': <String>[],
    },
  };
  return wire;
}
