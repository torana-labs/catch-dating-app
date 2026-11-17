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
        .watchWindow(
          const HostFormListRequest(organizerId: 'org', query: ' run '),
          limit: 1,
        )
        .first;

    expect(window.forms.map((item) => item.formId), ['run', 'supper']);
    expect(window.hasMore, isFalse);
  });

  test('a search keeps the status filter', () async {
    final window = await reads
        .watchWindow(
          const HostFormListRequest(
            organizerId: 'org',
            query: 'run',
            statuses: {HostFormLifecycleStatus.archived},
          ),
          limit: 25,
        )
        .first;

    expect(window.forms.map((item) => item.formId), ['old']);
  });

  test('a form the server changes shows in the open list', () async {
    final titles = reads
        .watchWindow(const HostFormListRequest(organizerId: 'org'), limit: 25)
        .map((window) => window.forms.map((item) => item.formId).toList());
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

  test('more forms than the window says so', () async {
    final window = await reads
        .watchWindow(const HostFormListRequest(organizerId: 'org'), limit: 2)
        .first;

    expect(window.forms.map((item) => item.formId), ['run', 'supper']);
    expect(window.hasMore, isTrue);
  });
}
