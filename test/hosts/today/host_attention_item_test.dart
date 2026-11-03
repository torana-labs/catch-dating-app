import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses a server-written attention row', () {
    final item = HostAttentionItem.fromFirestore('attention-1', _rowMap());

    expect(item.id, 'attention-1');
    expect(item.kind, HostAttentionKind.eventWaitlistReview);
    expect(item.status, HostAttentionStatus.open);
    expect(item.destination.eventId, 'event-1');
    expect(item.context.count, 3);
    expect(item.openedAt, DateTime.fromMillisecondsSinceEpoch(1000));
    expect(item.dueAt, DateTime.fromMillisecondsSinceEpoch(1500));
    expect(item.expiresAt, DateTime.fromMillisecondsSinceEpoch(2000));
  });

  test('a row without an action expiry stays actionable', () {
    final map = _rowMap()..['actionExpiresAt'] = null;
    expect(HostAttentionItem.fromFirestore('attention-1', map).expiresAt, null);
  });

  test('rejects unknown item vocabulary', () {
    final map = _rowMap()..['kind'] = 'guessedTask';

    expect(
      () => HostAttentionItem.fromFirestore('attention-1', map),
      throwsFormatException,
    );
  });

  test('rejects resolved rows and rows filed under another id', () {
    expect(
      () => HostAttentionItem.fromFirestore(
        'attention-1',
        _rowMap()..['status'] = 'resolved',
      ),
      throwsFormatException,
    );
    expect(
      () => HostAttentionItem.fromFirestore('attention-2', _rowMap()),
      throwsFormatException,
    );
  });

  test('rejects a row whose times are not Firestore timestamps', () {
    expect(
      () => HostAttentionItem.fromFirestore(
        'attention-1',
        _rowMap()..['dueAt'] = 'tomorrow',
      ),
      throwsFormatException,
    );
  });
}

Timestamp _at(int millis) => Timestamp.fromMillisecondsSinceEpoch(millis);

/// An `organizerAttentionItems` document as the evaluator writes it.
Map<String, Object?> _rowMap() => {
  'schemaVersion': 1,
  'attentionId': 'attention-1',
  'organizerId': 'organizer-1',
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
  'policyVersion': 4,
  'resolutionVersion': 1,
  'assignedHostUid': null,
  'openedAt': _at(1000),
  'dueAt': _at(1500),
  'actionExpiresAt': _at(2000),
  'sourceUpdatedAt': _at(900),
  'createdAt': _at(1000),
  'updatedAt': _at(1000),
  'resolvedAt': null,
  'purgeAt': null,
};
