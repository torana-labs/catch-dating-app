import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _seed(
  FakeFirebaseFirestore db,
  String id, {
  required String title,
  String? description,
  String status = 'published',
  int updatedAt = 1,
}) => db.collection('hostFormSummaries').doc(id).set({
  'organizerId': 'org',
  'formId': id,
  'version': 1,
  'status': status,
  'purpose': 'application',
  'updatedAtMillis': updatedAt,
  'row': {
    'organizerId': 'org',
    'formId': id,
    'title': title,
    'description': description,
    'purpose': 'application',
    'status': status,
    'templateId': 'blank',
    'publicFormId': 'public-form-123456789012',
    'defaultTargetKind': 'organizer',
    'defaultTargetId': null,
    'activeVersionId': 'version',
    'draftRevision': 1,
    'publishedVersion': 1,
    'submittedResponseCount': 0,
    'consequences': {
      'coverage': 'unavailable',
      'identityPolicy': null,
      'enabledAutomationActionKinds': <String>[],
    },
    'updatedAtMillis': updatedAt,
    'publishedAtMillis': null,
    'lastResponseAtMillis': null,
  },
});

void main() {
  late FakeFirebaseFirestore db;
  late HostFormSummaryReads reads;

  setUp(() async {
    db = FakeFirebaseFirestore();
    reads = HostFormSummaryReads(HostSummaryReader(db, actorId: () => 'host'));
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'formSummaryVersion': 1,
    });
    await _seed(db, 'run', title: 'Sunday Run sign-up', updatedAt: 3);
    await _seed(
      db,
      'supper',
      title: 'Supper club',
      description: 'Tell us how you RUN the table',
      updatedAt: 2,
    );
    await _seed(db, 'yoga', title: 'Yoga');
    await _seed(
      db,
      'old',
      title: 'Old run form',
      status: 'archived',
      updatedAt: 4,
    );
  });

  test('a search matches title or description, case-insensitive', () async {
    final window = await reads
        .watchPages(
          const HostFormListRequest(organizerId: 'org', query: ' run '),
          pageSize: 1,
        )
        .pages
        .first;

    // A search is one bounded listener: the page size does not apply.
    expect(window.items.map((item) => item.formId), ['run', 'supper']);
    expect(window.hasMore, isFalse);
  });

  test('a search keeps the status filter', () async {
    final window = await reads
        .watchPages(
          const HostFormListRequest(
            organizerId: 'org',
            query: 'run',
            statuses: {HostFormLifecycleStatus.archived},
          ),
          pageSize: 25,
        )
        .pages
        .first;

    expect(window.items.map((item) => item.formId), ['old']);
  });

  test('a form the server changes shows in the open list', () async {
    final titles = reads
        .watchPages(const HostFormListRequest(organizerId: 'org'), pageSize: 25)
        .pages
        .map((pages) => pages.items.map((item) => item.formId).toList());
    final expectation = expectLater(
      titles,
      emitsInOrder([
        ['run', 'supper', 'yoga'],
        ['yoga', 'run', 'supper'],
      ]),
    );
    await pumpEventQueue();
    await _seed(db, 'yoga', title: 'Yoga', updatedAt: 9);
    await expectation;
  });

  test('more forms than a page says so, and the next page follows', () async {
    final pager = reads.watchPages(
      const HostFormListRequest(organizerId: 'org'),
      pageSize: 2,
    );
    final emissions = <List<String>>[];
    final hasMore = <bool>[];
    final subscription = pager.pages.listen((pages) {
      emissions.add(pages.items.map((item) => item.formId).toList());
      hasMore.add(pages.hasMore);
    });
    addTearDown(subscription.cancel);
    await pumpEventQueue();

    expect(emissions.last, ['run', 'supper']);
    expect(hasMore.last, isTrue);

    pager.loadMore();
    await pumpEventQueue();
    expect(emissions.last, ['run', 'supper', 'yoga']);
    expect(hasMore.last, isFalse);
  });

  test('a search has no further page', () async {
    final pager = reads.watchPages(
      const HostFormListRequest(organizerId: 'org', query: 'run'),
      pageSize: 1,
    );
    final first = await pager.pages.first;
    pager.loadMore();

    expect(first.items, hasLength(2));
    expect(first.hasMore, isFalse);
  });
}
