import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_summary_reads.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _seed(
  FakeFirebaseFirestore db,
  String id,
  String name, {
  int lastSeen = 0,
  List<String> segments = const [],
}) => db.collection('hostContactSummaries').doc(id).set({
  'organizerId': 'org',
  'version': 1,
  'searchName': name.toLowerCase(),
  'lastSeenAtMillis': lastSeen,
  'manualTagIds': const <String>[],
  'row': {
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
    'segmentIds': segments,
    'manualTags': const <Object?>[],
    'whatsappStatus': 'unknown',
    'whatsappAdminSuppressed': false,
    'smsStatus': 'unknown',
    'sourceCoverage': 'exact',
    'revision': 1,
  },
});

void main() {
  late FakeFirebaseFirestore db;
  late HostContactSummaryReads reads;

  setUp(() async {
    db = FakeFirebaseFirestore();
    reads = HostContactSummaryReads(
      ScopedReadModelReader(db, family: hostReadModels, actorId: () => 'host'),
    );
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'contactSummaryVersion': 1,
      'projectionVersion': 1,
      'sourceCoverage': 'exact',
      'segmentCounts': {'regular': 2},
      'manualTagVocabulary': const <Object?>[],
      'summary': {'contactCount': 4},
    });
    await _seed(db, 'c1', 'Ashwin', lastSeen: 30, segments: ['regular']);
    await _seed(db, 'c2', 'Asha Rao', lastSeen: 10);
    await _seed(db, 'c3', 'Bina', lastSeen: 40, segments: ['regular']);
    await _seed(db, 'c4', 'ashley', lastSeen: 20, segments: ['regular']);
  });

  test('a name search is served by the read model', () {
    expect(
      HostContactSummaryReads.supports(const HostAudienceQuery(search: 'as')),
      isTrue,
    );
    expect(
      HostContactSummaryReads.supports(
        HostAudienceQuery(
          search: 'as',
          segments: const {HostAudienceSegment.regular},
          manualTagIds: {'a' * 32},
        ),
      ),
      isFalse,
    );
  });

  test('matches by name prefix, case-insensitive, listed by name', () async {
    final page = await reads.list(
      'org',
      query: const HostAudienceQuery(search: '  AS '),
      limit: 30,
    );

    expect(page.contacts.map((contact) => contact.displayName), [
      'Asha Rao',
      'ashley',
      'Ashwin',
    ]);
    expect(page.matchCount, 3);
    expect(page.matchCountCoverage, HostAudienceMatchCountCoverage.exact);
  });

  test('combines a search with one segment filter', () async {
    final page = await reads.list(
      'org',
      query: const HostAudienceQuery(
        search: 'ash',
        segment: HostAudienceSegment.regular,
        sort: HostAudienceSort.mostAttended,
      ),
      limit: 30,
    );

    expect(page.contacts.map((contact) => contact.contactId), ['c4', 'c1']);
  });

  test('a search has no directory count', () async {
    expect(
      await reads.count('org', const HostAudienceQuery(search: 'as')),
      isNull,
    );
  });
}
