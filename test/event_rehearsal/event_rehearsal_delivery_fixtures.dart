import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';

import 'event_rehearsal_assistance_fixtures.dart';

Map<String, Object?> practiceDeliveryRow({
  bool manual = false,
  String status = 'accepted',
  int revision = 1,
}) => {
  'messageId': practiceMessageId,
  'revision': revision,
  'reviewHash': (manual ? 'c' : 'b') * 64,
  'createdAt': 500,
  'expiresAt': 3600000,
  'lifecycle': 'active',
  'purpose': 'joiningUpdate',
  'deliveryStatus': status,
  'attempts': [
    {'channel': 'sms', 'state': status, 'at': 500},
  ],
  'coordination': {'kind': 'untracked'},
  'handling': manual
      ? {
          'kind': 'manual',
          'actorUid': 'host-1',
          'at': 1000,
          'authority': 'current',
        }
      : {'kind': 'automatic'},
  'availability': 'current',
  'attendeeId': 'actor-01',
  'actions': manual || ['delivered', 'read'].contains(status)
      ? <String>[]
      : ['manualHandoff'],
};

Map<String, Object?> practiceDeliveryBootstrap({
  Map<String, Object?>? row,
  int runtimeRevision = 4,
  List<Map<String, Object?>>? actions,
}) {
  final delivery = row ?? practiceDeliveryRow();
  final actor = practiceActor(withAssistance: true);
  final old = actor['assistanceDelivery']! as Map<String, Object?>;
  old['conflictingEvidence'] =
      delivery['deliveryStatus'] == 'conflictingEvidence';
  final attempts = delivery['attempts']! as List;
  old['attempts'] = [
    for (var i = 0; i < attempts.length; i++)
      {
        'attemptId': 'attempt-$i',
        'routeId': switch ((attempts[i] as Map)['channel']) {
          'sms' => 'catchEventSms',
          'whatsapp' => 'organizerEventWhatsapp',
          _ => 'catchEventRcs',
        },
        'status': (attempts[i] as Map)['state'],
      },
  ];
  final instruction = actor['assistanceMessage']! as Map<String, Object?>;
  instruction['lifecycle'] = delivery['lifecycle'];
  instruction['expiresAt'] = delivery['expiresAt'];
  instruction['canRespond'] = delivery['lifecycle'] == 'active';
  if (delivery['lifecycle'] == 'responded') {
    instruction['responseChoiceId'] = 'on-my-way';
  }
  final result = practiceBootstrap(
    runtimeRevision: runtimeRevision,
    actors: [
      actor,
      {...practiceActor(), 'actorId': 'actor-02'},
    ],
    actions: actions,
  );
  for (final a in result['actors']! as List) {
    (a as Map)['layoutUnitId'] = null;
    a['confirmedLayoutUnitId'] = null;
  }
  result['deliveryReviews'] = {
    'context': {
      'mode': 'rehearsal',
      'rehearsalId': 'session-1',
      'virtualEventId': 'practice:${sha256Digest(jsonEncode('session-1'))}',
      'clockId': 'clock:${sha256Digest(jsonEncode(['session-1', 0, 1]))}',
    },
    'coverage': 'currentActorMessages',
    'deliveries': [delivery],
  };
  return result;
}

EventRehearsalBootstrap practiceDeliverySnapshot() =>
    EventRehearsalBootstrap.fromCallableData(practiceDeliveryBootstrap());

RehearsalAssistanceChange practiceDeliveryChange() {
  final snapshot = practiceDeliverySnapshot();
  return RehearsalAssistanceChange(
    snapshot: snapshot,
    command: RehearsalTakeDelivery(
      snapshot:
          snapshot.deliveryReviews!.deliveries.single
              as RehearsalActionableDelivery,
      actorUid: 'host-1',
    ),
    clientActionId: 'handoff-once',
  );
}

Map<String, Object?> practiceDeliveryResult(
  RehearsalAssistanceChange change, {
  String status = 'accepted',
  int laterActions = 0,
}) {
  final original = (change.command as RehearsalTakeDelivery).snapshot.evidence;
  return practiceDeliveryBootstrap(
    row: practiceDeliveryRow(
      manual: true,
      status: status,
      revision: original.revision + 1 + laterActions,
    ),
    runtimeRevision: change.session.runtimeRevision + 1 + laterActions,
    actions: [practiceReceipt(change)],
  );
}
