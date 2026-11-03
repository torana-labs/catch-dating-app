import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/host_attention_policies.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  group('catalog coverage', () {
    test('has one row per kind, in catalog order', () {
      expect(
        hostAttentionCatalogCoverage.map((row) => row.kind),
        HostAttentionKind.values,
      );
      expect(
        hostAttentionCatalogCoverage.map((row) => row.reason),
        everyElement(isNotEmpty),
      );
    });

    test('maps each delivery mode to its Today coverage state', () {
      HostAttentionCoverageState stateOf(HostAttentionKind kind) =>
          hostAttentionCatalogCoverage
              .firstWhere((row) => row.kind == kind)
              .state;

      expect(
        stateOf(HostAttentionKind.attendanceSync),
        HostAttentionCoverageState.clientMergeRequired,
      );
      expect(
        stateOf(HostAttentionKind.dressRehearsal),
        HostAttentionCoverageState.shortcutOnly,
      );
      for (final kind in [
        HostAttentionKind.eventSuccessPreparation,
        HostAttentionKind.roomLayoutSetup,
        HostAttentionKind.eventStaffing,
        HostAttentionKind.formResponseReview,
        HostAttentionKind.inboxReply,
        HostAttentionKind.postEventReconciliation,
      ]) {
        expect(
          stateOf(kind),
          HostAttentionCoverageState.blockedMissingTruth,
          reason: kind.name,
        );
      }
      expect(
        stateOf(HostAttentionKind.eventOfferPaymentFollowUp),
        HostAttentionCoverageState.complete,
      );
      for (final mode in HostAttentionDeliveryMode.values) {
        expect(hostAttentionCoverageState(mode), isNotNull);
      }
    });
  });

  group('projection', () {
    test('a missing schedule means no evaluation is recorded yet', () {
      final projection = HostAttentionProjection.fromFirestore(
        organizerId: 'organizer-1',
        items: const [],
        schedule: null,
      );
      expect(projection.sourceCoverage, HostAttentionSourceCoverage.missing);
      expect(projection.isComplete, isFalse);
      expect(projection.evaluatedAt, isNull);
      expect(projection.policyVersion, hostAttentionPolicyVersion);
      expect(projection.coverage, hostAttentionCatalogCoverage);
    });

    test('reads the evaluation and orders items for Today', () {
      final projection = HostAttentionProjection.fromFirestore(
        organizerId: 'organizer-1',
        items: [
          _item('upcoming', urgency: HostAttentionUrgency.upcoming, dueAt: 1),
          _item('soon-late', urgency: HostAttentionUrgency.soon, dueAt: 9),
          _item('soon-early', urgency: HostAttentionUrgency.soon, dueAt: 5),
          _item(
            'soon-blocking',
            urgency: HostAttentionUrgency.soon,
            dueAt: 9,
            blocking: true,
          ),
        ],
        schedule: _schedule(sourceCoverage: 'overCap'),
      );
      expect(projection.items.map((item) => item.id), [
        'soon-blocking',
        'soon-early',
        'soon-late',
        'upcoming',
      ]);
      expect(projection.sourceCoverage, HostAttentionSourceCoverage.overCap);
      expect(projection.evaluatedAt, DateTime.fromMillisecondsSinceEpoch(5000));
    });

    test('an invalid source evaluation is incomplete', () {
      final projection = HostAttentionProjection.fromFirestore(
        organizerId: 'organizer-1',
        items: const [],
        schedule: _schedule(sourceCoverage: 'invalidSource'),
      );
      expect(
        projection.sourceCoverage,
        HostAttentionSourceCoverage.invalidSource,
      );
      expect(projection.isComplete, isFalse);
    });

    test('rejects another organizer schedule or an unknown coverage', () {
      expect(
        () => HostAttentionProjection.fromFirestore(
          organizerId: 'organizer-2',
          items: const [],
          schedule: _schedule(),
        ),
        throwsFormatException,
      );
      expect(
        () => HostAttentionProjection.fromFirestore(
          organizerId: 'organizer-1',
          items: const [],
          schedule: _schedule(sourceCoverage: 'partial'),
        ),
        throwsFormatException,
      );
    });
  });

  group('repository listener', () {
    test('combines open rows with the schedule and follows changes', () async {
      final db = FakeFirebaseFirestore();
      final repository = FirebaseHostAttentionRepository(db);
      await db
          .collection('organizerAttentionItems')
          .doc('attention-open')
          .set(_row('attention-open', 'organizer-1', 'open'));
      await db
          .collection('organizerAttentionItems')
          .doc('attention-resolved')
          .set(_row('attention-resolved', 'organizer-1', 'resolved'));
      await db
          .collection('organizerAttentionItems')
          .doc('attention-foreign')
          .set(_row('attention-foreign', 'organizer-2', 'open'));

      final seen = <HostAttentionProjection>[];
      final subscription = repository.watch('organizer-1').listen(seen.add);
      addTearDown(subscription.cancel);
      await flushTestEventQueue();

      expect(seen.last.items.map((item) => item.id), ['attention-open']);
      expect(seen.last.sourceCoverage, HostAttentionSourceCoverage.missing);

      await db
          .collection('organizerAttentionSchedules')
          .doc('organizer-1')
          .set(_schedule());
      await flushTestEventQueue();
      expect(seen.last.sourceCoverage, HostAttentionSourceCoverage.complete);

      await db
          .collection('organizerAttentionItems')
          .doc('attention-open')
          .update({'status': 'resolved'});
      await flushTestEventQueue();
      expect(seen.last.items, isEmpty);
    });
  });
}

Map<String, Object?> _schedule({String sourceCoverage = 'complete'}) => {
  'schemaVersion': 1,
  'organizerId': 'organizer-1',
  'policyVersion': hostAttentionPolicyVersion,
  'revision': 2,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(5000),
  'nextEvaluationAt': null,
  'sourceCoverage': sourceCoverage,
  'incompleteSource': sourceCoverage == 'complete'
      ? null
      : 'organizerApplications',
  'openItemCount': 0,
};

HostAttentionItem _item(
  String id, {
  required HostAttentionUrgency urgency,
  required int dueAt,
  bool blocking = false,
}) => HostAttentionItem(
  id: id,
  kind: HostAttentionKind.applicationReview,
  scope: HostAttentionScope.application,
  sourceOwner: HostAttentionSourceOwner.organizerApplications,
  sourceId: id,
  sourceRevision: '1',
  eventId: null,
  status: HostAttentionStatus.open,
  consequence: HostAttentionConsequence.delaysResponse,
  blocking: blocking,
  urgency: urgency,
  destination: const HostAttentionDestination(
    route: HostAttentionDestinationRoute.hostApplications,
  ),
  context: const HostAttentionContext(),
  dedupeKey: 'applicationReview:$id',
  policyVersion: hostAttentionPolicyVersion,
  resolutionVersion: 1,
  assignedHostUid: null,
  openedAt: DateTime.fromMillisecondsSinceEpoch(0),
  dueAt: DateTime.fromMillisecondsSinceEpoch(dueAt),
  expiresAt: null,
);

Map<String, Object?> _row(String id, String organizerId, String status) => {
  'schemaVersion': 1,
  'attentionId': id,
  'organizerId': organizerId,
  'kind': 'applicationReview',
  'scope': 'application',
  'sourceOwner': 'organizerApplications',
  'sourceId': id,
  'sourceRevision': '1',
  'eventId': null,
  'status': status,
  'consequence': 'delaysResponse',
  'blocking': false,
  'urgency': 'upcoming',
  'destination': <String, Object?>{
    'route': 'hostApplications',
    'section': null,
    'eventId': null,
    'applicationId': id,
    'formId': null,
    'threadId': null,
  },
  'context': <String, Object?>{
    'eventName': null,
    'subjectLabel': 'Asha',
    'count': null,
    'provider': null,
    'errorCode': null,
  },
  'dedupeKey': 'applicationReview:$id',
  'policyVersion': hostAttentionPolicyVersion,
  'resolutionVersion': 1,
  'assignedHostUid': null,
  'openedAt': Timestamp.fromMillisecondsSinceEpoch(1000),
  'dueAt': Timestamp.fromMillisecondsSinceEpoch(2000),
  'actionExpiresAt': null,
  'sourceUpdatedAt': Timestamp.fromMillisecondsSinceEpoch(900),
  'createdAt': Timestamp.fromMillisecondsSinceEpoch(1000),
  'updatedAt': Timestamp.fromMillisecondsSinceEpoch(1000),
  'resolvedAt': null,
  'purgeAt': null,
};
