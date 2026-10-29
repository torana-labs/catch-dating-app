import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_summary_reads.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/hosts/data/read_models/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('pages have stable ties and never include another organizer', () async {
    final db = FakeFirebaseFirestore();
    final reader = HostSummaryReader(db, actorId: () => 'host');
    for (final id in ['a', 'b', 'c']) {
      await db.collection('hostContactSummaries').doc(id).set({
        'organizerId': 'org',
        'version': 1,
        'lastSeenAtMillis': 10,
      });
    }
    await db.collection('hostContactSummaries').doc('foreign').set({
      'organizerId': 'other',
      'version': 1,
      'lastSeenAtMillis': 20,
    });
    final first = await reader.page(
      collection: 'hostContactSummaries',
      organizerId: 'org',
      orderField: 'lastSeenAtMillis',
      descending: true,
      queryKey: 'all',
      limit: 2,
    );
    expect(first.documents.length, 2);
    expect(first.nextCursor, isNotNull);
    // The fake SDK cannot cursor over FieldPath.documentId. The real SDK
    // continuation (including ties) is exercised in firestore.rules.test.cjs.
    expect(
      HostSummaryCursor.decode(
        first.nextCursor,
        HostSummaryCursor.scope('host', 'org', 'hostContactSummaries', 'all'),
      ),
      [10, 'b'],
    );
    await expectLater(
      reader.page(
        collection: 'hostContactSummaries',
        organizerId: 'other',
        orderField: 'lastSeenAtMillis',
        descending: true,
        queryKey: 'all',
        limit: 2,
        cursor: first.nextCursor,
      ),
      throwsFormatException,
    );
    await expectLater(
      reader.page(
        collection: 'hostContactSummaries',
        organizerId: 'org',
        orderField: 'lastSeenAtMillis',
        descending: true,
        queryKey: 'new',
        limit: 2,
        cursor: first.nextCursor,
      ),
      throwsFormatException,
    );
  });

  test('a read crossing an account switch never delivers its result', () async {
    final db = FakeFirebaseFirestore();
    var actor = 'first';
    final reader = HostSummaryReader(db, actorId: () => actor);
    final pending = reader.directory('org');
    actor = 'second';
    await expectLater(pending, throwsStateError);
  });

  test('migration falls back only while the marker is absent', () async {
    final reads = HostContactSummaryReads(
      HostSummaryReader(FakeFirebaseFirestore(), actorId: () => 'host'),
    );
    expect(
      await reads.list('org', query: const HostAudienceQuery(), limit: 30),
      isNull,
    );
    await expectLater(
      reads.list(
        'org',
        query: HostAudienceQuery(
          cursor: HostSummaryCursor.encode('old', 1, 'a'),
        ),
        limit: 30,
      ),
      throwsStateError,
    );
  });

  test('unsupported intersecting filter groups retain server evaluation', () {
    expect(
      HostContactSummaryReads.supports(
        const HostAudienceQuery(segment: HostAudienceSegment.newToOrganizer),
      ),
      isTrue,
    );
    expect(
      HostContactSummaryReads.supports(
        const HostAudienceQuery(
          segment: HostAudienceSegment.newToOrganizer,
          manualTagId: 'tag',
        ),
      ),
      isFalse,
    );
  });
}
