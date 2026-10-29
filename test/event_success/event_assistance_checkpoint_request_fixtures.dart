import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';

import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_departure_fixtures.dart';

Map<String, Object?> requestReadyWire({bool resolved = true}) {
  final wire = checkpointClosedWire();
  final body = checkpointBody(wire);
  (body['request']! as Map).addAll(<String, Object>{
    'state': 'discrepancy',
    'ownerAvailability': 'current',
  });
  body['closeout'] = <String, Object?>{
    'revision': 0,
    'sourceHash': '9' * 64,
    'change': null,
    'state': {'kind': 'open'},
    'eligibility': resolved
        ? {'kind': 'ready'}
        : {
            'kind': 'unavailable',
            'reason': 'unresolvedMembers',
            'attendeeIds': ['b'],
          },
  };
  if (!resolved) {
    (((body['availability']! as Map)['members']! as List)[1]
        as Map)['disposition'] = {
      'kind': 'unresolved',
    };
  }
  body['reporterOptions'] = {
    'actorUid': 'host-1',
    'sourceHash': (body['assignment']! as Map)['sourceHash'],
    'validUntil': 5000,
    'reporters': [
      {
        'operatorId': 'host-1',
        'displayName': 'Sam',
        'validUntil': 9007199254740991,
      },
      {
        'operatorId': 'sweep-2',
        'displayName': 'Priya',
        'validUntil': 9007199254740991,
      },
    ],
  };
  return wire;
}

EventAssistanceGroupProgressView checkpointOperator({
  String actorUid = 'host-1',
  String authority = 'canConfirm',
  String reporter = 'anyAuthorizedOperator',
  int now = 1001,
  int validUntil = 5000,
  bool eventOpen = true,
  EventAssistanceGroupScope? scope,
}) {
  final selected = scope ?? checkpointScope.group;
  final wire = departureResponse(
    scope: selected,
    actorUid: actorUid,
    authority: authority,
    reporter: reporter,
    validUntil: validUntil,
    eventOpen: eventOpen,
    runtimeLive: eventOpen,
  );
  departureRawView(wire)['serverTime'] = now;
  return parseDeparture(wire, scope: selected, actorUid: actorUid).view;
}

EventAssistanceCheckpointRequestReview requestReview({
  Map<String, Object?>? wire,
  EventAssistanceGroupProgressView? operator,
}) => EventAssistanceCheckpointRequestReview(
  checkpoint: checkpointResult(wire ?? requestReadyWire()).view,
  operator: operator ?? checkpointOperator(),
);

final reassignReporter = ReassignCheckpointReporter(
  reporterId: 'sweep-2',
  reason: 'Next shift',
);
EventAssistanceCheckpointRequestChange requestChange({
  CheckpointRequestDecision? decision,
  Map<String, Object?>? wire,
  EventAssistanceGroupProgressView? operator,
}) => EventAssistanceCheckpointRequestChange(
  review: requestReview(wire: wire, operator: operator),
  decision: decision ?? CloseCheckpointRequest('Guest left early'),
  operationId: 'checkpoint-request-1',
);

Map<String, Object?> requestAppliedWire(
  EventAssistanceCheckpointRequestChange change, {
  Map<String, Object?>? before,
}) {
  final wire = checkpointCopy(
    before ??
        (change.decision is ReopenCheckpointRequest
            ? checkpointClosedWire()
            : requestReadyWire()),
  );
  final body = checkpointBody(wire);
  wire.addAll(<String, Object>{
    'outcome': 'applied',
    'operationRevision': change.expectedRevision + 1,
  });
  body['serverTime'] = change.review.serverTime + 200;
  body.remove('reporterOptions');
  if (change.decision case ReassignCheckpointReporter(:final reporterId)) {
    body['assignment'] = {
      'revision': change.expectedRevision + 1,
      'sourceHash': '6' * 64,
      'change': {
        'revision': change.expectedRevision + 1,
        'receiptId': 'checkpoint-reassignment:${'5' * 64}',
        'responsibleOperatorId': reporterId,
        'previousResponsibleOperatorId':
            change.snapshot.request!.responsibleOperatorId,
        'assignedBy': change.actorUid,
        'assignedAt': change.review.serverTime + 100,
        'reason': change.decision.reason,
      },
    };
    (body['request']! as Map).addAll(<String, Object>{
      'responsibleOperatorId': reporterId,
      'ownerAvailability': 'current',
    });
  } else {
    final close = change.decision is CloseCheckpointRequest;
    final members = ((body['availability']! as Map)['members']! as List)
        .cast<Map>();
    body['closeout'] = {
      'revision': change.expectedRevision + 1,
      'sourceHash': 'f' * 64,
      'change': {
        'revision': change.expectedRevision + 1,
        'previousRevision': change.expectedRevision,
        'receiptId': 'checkpoint-closeout:${'4' * 64}',
        'changedBy': change.actorUid,
        'changedAt': change.review.serverTime + 100,
        'reason': change.decision.reason,
        'decision': close
            ? {
                'kind': 'close',
                'report': body['report'],
                'dispositions': [
                  for (final m in members)
                    if (m['observation'] == 'unconfirmed')
                      {
                        'attendeeId': m['attendeeId'],
                        ...(m['disposition']! as Map),
                      },
                ],
              }
            : {'kind': 'reopen'},
      },
      'state': {'kind': close ? 'closedOut' : 'reopened'},
      'eligibility': close
          ? {
              'kind': 'unavailable',
              'reason': 'alreadyClosed',
              'attendeeIds': <String>[],
            }
          : {'kind': 'ready'},
    };
    (body['request']! as Map).addAll(<String, Object>{
      'state': close ? 'closedOut' : 'discrepancy',
      'ownerAvailability': close ? 'notRequired' : 'current',
    });
  }
  return wire;
}
