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
    final page = await reads.list(
      const HostFormListRequest(organizerId: 'org', query: ' run '),
    );

    expect(page.items.map((item) => item.formId), ['run', 'supper']);
    expect(page.nextCursor, isNull);
  });

  test('a search keeps the status filter', () async {
    final page = await reads.list(
      const HostFormListRequest(
        organizerId: 'org',
        query: 'run',
        statuses: {HostFormLifecycleStatus.archived},
      ),
    );

    expect(page.items.map((item) => item.formId), ['old']);
  });
}
