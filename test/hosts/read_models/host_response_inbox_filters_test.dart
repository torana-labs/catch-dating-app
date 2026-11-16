import 'package:catch_dating_app/contexts/forms/data/read_models/host_response_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _response(String id, int at) => {
  'responseId': id,
  'formId': 'form',
  'formTitle': 'Survey',
  'versionId': 'version',
  'version': 1,
  'status': 'submitted',
  'identityKind': 'anonymous',
  'identity': {
    'displayName': 'Asha',
    'email': null,
    'phoneE164': null,
    'origin': 'organizerAcquired',
  },
  'sourceLinkId': null,
  'sourceLabel': null,
  'submittedAtMillis': at,
  'withdrawnAtMillis': null,
  'highlights': const <Object?>[],
  'conversionKinds': const <Object?>[],
};

void main() {
  late FakeFirebaseFirestore db;
  late HostResponseSummaryReads reads;

  Future<void> entry(String id, int at, {String? reviewStatus}) =>
      db.collection('hostResponseSummaries').doc(id).set({
        'organizerId': 'org',
        'version': 1,
        'kind': 'response',
        'formId': 'form',
        'submittedAtMillis': at,
        'reviewStatus': ?reviewStatus,
        'row': {
          'entryId': 'response:$id',
          'submittedAtMillis': at,
          'response': _response(id, at),
          'application': null,
        },
      });

  setUp(() async {
    db = FakeFirebaseFirestore();
    reads = HostResponseSummaryReads(
      HostSummaryReader(db, actorId: () => 'host'),
    );
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'responseSummaryVersion': 1,
    });
    await entry('a', 1000, reviewStatus: 'approved');
    await entry('b', 2000, reviewStatus: 'inReview');
    await entry('c', 3000);
  });

  test('a submission date range is inclusive at both ends', () async {
    final page = await reads.list(
      HostFormResponseListRequest(
        organizerId: 'org',
        includeApplications: true,
        from: DateTime.fromMillisecondsSinceEpoch(2000),
        to: DateTime.fromMillisecondsSinceEpoch(3000),
      ),
    );

    expect(page.entries!.map((entry) => entry.entryId), [
      'response:c',
      'response:b',
    ]);
  });

  test('a review status reads only entries with that status', () async {
    final page = await reads.list(
      const HostFormResponseListRequest(
        organizerId: 'org',
        includeApplications: true,
        reviewStatus: HostApplicationReviewStatus.approved,
      ),
    );

    expect(page.entries!.map((entry) => entry.entryId), ['response:a']);
  });

  test('a review status needs applications in the inbox', () {
    expect(
      HostResponseSummaryReads.supports(
        const HostFormResponseListRequest(
          organizerId: 'org',
          reviewStatus: HostApplicationReviewStatus.approved,
        ),
      ),
      isFalse,
    );
    expect(
      HostResponseSummaryReads.supports(
        const HostFormResponseListRequest(
          organizerId: 'org',
          formId: 'form',
          includeApplications: true,
          reviewStatus: HostApplicationReviewStatus.approved,
        ),
      ),
      isFalse,
      reason: 'Form-scoped pages keep the callable for their filter options.',
    );
  });
}
