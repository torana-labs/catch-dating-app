import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_summary_reads.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _row(String id, String name) => {
  'contactId': id,
  'displayName': name,
  'phoneE164': null,
  'email': null,
  'identityState': 'unlinked',
  'identityConfidence': 'none',
  'ambiguousCandidateCount': 0,
  'attendedEventCount': 1,
  'expectedEventCount': 1,
  'lastAttendedAtMillis': null,
  'segmentIds': const <String>[],
  'manualTags': const <Object?>[],
  'whatsappStatus': 'unknown',
  'whatsappAdminSuppressed': false,
  'smsStatus': 'unknown',
  'sourceCoverage': 'exact',
  'revision': 1,
};

void main() {
  late FakeFirebaseFirestore db;
  late HostContactSummaryReads reads;

  Future<void> contact(String id, String name, int lastSeen) =>
      db.collection('hostContactSummaries').doc(id).set({
        'organizerId': 'org',
        'version': 1,
        'searchName': name.toLowerCase(),
        'lastSeenAtMillis': lastSeen,
        'row': _row(id, name),
      });

  setUp(() async {
    db = FakeFirebaseFirestore();
    reads = HostContactSummaryReads(
      HostSummaryReader(db, actorId: () => 'host'),
    );
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'contactSummaryVersion': 1,
      'segmentCounts': {'regular': 2},
      'summary': {'contactCount': 3},
    });
    await contact('a', 'Asha', 30);
    await contact('b', 'Bina', 20);
    await contact('c', 'Chand', 10);
  });

  test('a window lists the first rows and says whether more follow', () async {
    final window = await reads
        .watchWindow('org', query: const HostAudienceQuery(), limit: 2)
        .first;

    expect(window.contacts.map((row) => row.contactId), ['a', 'b']);
    expect(window.hasMore, isTrue);
  });

  test('a contact the server adds shows in the open window', () async {
    final ids = reads
        .watchWindow('org', query: const HostAudienceQuery(), limit: 10)
        .map((window) => window.contacts.map((row) => row.contactId).toList());
    final expectation = expectLater(
      ids,
      emitsInOrder([
        ['a', 'b', 'c'],
        ['d', 'a', 'b', 'c'],
      ]),
    );
    await pumpEventQueue();
    await contact('d', 'Dev', 40);
    await expectation;
  });

  test('the directory counts follow the server', () async {
    final counts = reads
        .watchDirectory('org')
        .map((directory) => directory.count(const HostAudienceQuery()));
    final expectation = expectLater(counts, emitsInOrder([3, 4]));
    await pumpEventQueue();
    await db.collection('hostDirectorySummaries').doc('org').update({
      'summary': {'contactCount': 4},
    });
    await expectation;
  });
}
