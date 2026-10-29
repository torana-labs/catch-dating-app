import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';

import '../event_success/event_assistance_membership_fixtures.dart';
import 'event_rehearsal_accountability_fixtures.dart';
import 'event_rehearsal_assistance_fixtures.dart';

Map<String, Object?> practiceMembershipRow({
  String state = 'uninitialized',
  String uid = 'host-1',
  int index = 1,
}) => {
  'attendeeId': 'actor-0$index',
  'sourceHash': 'a' * 64,
  'serverTime': 1000,
  'revision': state == 'uninitialized'
      ? 0
      : state == 'pending'
      ? 2
      : 1,
  'episodeId': 'episode:${'e' * 64}',
  'participationRevision': 0,
  'freshness': state == 'uninitialized' ? 'uninitialized' : 'current',
  'ready': true,
  'accepted': state == 'uninitialized' ? null : acceptedGroupWire(),
  'transfer': state == 'pending' ? transferWire() : null,
  'transferState': state == 'pending' ? 'pending' : 'none',
  'groups': [
    {'groupId': 'easy', 'label': 'Easy'},
    {'groupId': 'tempo', 'label': 'Tempo'},
  ],
  'actions': state == 'uninitialized'
      ? ['place', 'propose']
      : state == 'pending'
      ? [
          if (uid == 'host-2') ...['accept', 'reject'],
          'cancel',
          'leave',
        ]
      : ['propose', 'leave'],
  'availability': 'ready',
};

Map<String, Object?> practiceMembershipWire({
  String state = 'uninitialized',
  String uid = 'host-1',
  Map<String, Object?>? row,
  int runtimeRevision = 4,
  int actionCount = 1,
  List<Map<String, Object?>>? actions,
}) =>
    practiceBootstrap(
        runtimeRevision: runtimeRevision,
        actionCount: actionCount,
        actions: actions,
      )
      ..['membershipReviews'] = {
        'clockId': practiceVisitClock,
        'actorUid': uid,
        'coverage': 'boundedSession',
        'receivingOperatorIds': ['host-1', 'host-2'],
        'rows': [
          row ?? practiceMembershipRow(state: state, uid: uid),
          practiceMembershipRow(index: 2),
        ],
      };

EventRehearsalBootstrap practiceMembershipSnapshot({
  String state = 'uninitialized',
  String uid = 'host-1',
}) => EventRehearsalBootstrap.fromCallableData(
  practiceMembershipWire(state: state, uid: uid),
);

RehearsalAssistanceChange practiceMembershipChange({
  EventRehearsalBootstrap? snapshot,
  AssistanceMembershipDecision decision = const AssistancePlaceGroup('easy'),
}) {
  final review = snapshot ?? practiceMembershipSnapshot();
  return RehearsalAssistanceChange(
    snapshot: review,
    clientActionId: 'membership-once',
    command: RehearsalTransferGroup(
      snapshot: review.membershipReviews!.rows.first,
      decision: decision,
    ),
  );
}

Map<String, Object?> practicePlacementResult(
  RehearsalAssistanceChange change,
) => practiceMembershipWire(
  runtimeRevision: change.session.runtimeRevision + 1,
  actionCount: change.session.actionCount + 1,
  actions: [practiceReceipt(change)],
  row: {
    ...practiceMembershipRow(state: 'current'),
    'accepted': acceptedGroupWire(at: 1000),
  },
);
