import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses the complete callable attention contract', () {
    final projection = HostAttentionProjection.fromCallableData(
      _projectionMap(),
    );

    expect(projection.organizerId, 'organizer-1');
    expect(projection.items.single.kind, HostAttentionKind.eventWaitlistReview);
    expect(projection.items.single.destination.eventId, 'event-1');
    expect(projection.items.single.context.count, 3);
    expect(projection.coverage, hasLength(HostAttentionKind.values.length));
  });

  test('rejects unknown item vocabulary', () {
    final map = _projectionMap();
    final item =
        (map['items']! as List<Object?>).single! as Map<String, Object?>;
    item['kind'] = 'guessedTask';

    expect(
      () => HostAttentionProjection.fromCallableData(map),
      throwsFormatException,
    );
  });

  test('rejects partial or duplicated coverage', () {
    final partial = _projectionMap();
    (partial['coverage']! as List<Object?>).removeLast();
    expect(
      () => HostAttentionProjection.fromCallableData(partial),
      throwsFormatException,
    );

    final duplicated = _projectionMap();
    final coverage = duplicated['coverage']! as List<Object?>;
    coverage[1] = coverage.first;
    expect(
      () => HostAttentionProjection.fromCallableData(duplicated),
      throwsFormatException,
    );
  });
}

Map<String, Object?> _projectionMap() => {
  'organizerId': 'organizer-1',
  'policyVersion': 1,
  'generatedAtMillis': 1000,
  'horizonEndsAtMillis': 2000,
  'items': <Object?>[
    <String, Object?>{
      'attentionId': 'attention-1',
      'kind': 'eventWaitlistReview',
      'scope': 'event',
      'sourceOwner': 'events',
      'sourceId': 'event-1',
      'sourceRevision': 'revision-1',
      'eventId': 'event-1',
      'status': 'open',
      'consequence': 'risksGuestExperience',
      'blocking': false,
      'urgency': 'immediate',
      'destination': <String, Object?>{
        'route': 'hostEventManage',
        'section': 'guests',
        'eventId': 'event-1',
        'applicationId': null,
        'formId': null,
        'threadId': null,
      },
      'context': <String, Object?>{
        'eventName': 'Sunday Run',
        'subjectLabel': null,
        'count': 3,
        'provider': null,
        'errorCode': null,
      },
      'dedupeKey': 'eventWaitlistReview:event-1',
      'policyVersion': 1,
      'resolutionVersion': 1,
      'assignedHostUid': null,
      'openedAtMillis': 1000,
      'dueAtMillis': 1500,
      'expiresAtMillis': 2000,
    },
  ],
  'coverage': <Object?>[
    for (final kind in HostAttentionKind.values)
      <String, Object?>{
        'kind': kind.name,
        'state': switch (kind) {
          HostAttentionKind.attendanceSync => 'clientMergeRequired',
          HostAttentionKind.dressRehearsal => 'shortcutOnly',
          HostAttentionKind.eventSuccessPreparation ||
          HostAttentionKind.roomLayoutSetup ||
          HostAttentionKind.eventStaffing ||
          HostAttentionKind.formResponseReview ||
          HostAttentionKind.inboxReply ||
          HostAttentionKind.postEventReconciliation => 'blockedMissingTruth',
          _ => 'complete',
        },
        'reason': 'Fixture coverage for ${kind.name}.',
      },
  ],
};
