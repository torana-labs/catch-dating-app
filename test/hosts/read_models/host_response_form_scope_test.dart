import 'package:catch_dating_app/contexts/forms/data/read_models/host_response_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _response(String id, int at, String formId, String v) => {
  'responseId': id,
  'formId': formId,
  'formTitle': 'Survey',
  'versionId': v,
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

Map<String, Object?> _formRow(String formId) => {
  'organizerId': 'org',
  'formId': formId,
  'title': 'Survey',
  'description': null,
  'purpose': 'survey',
  'status': 'published',
  'templateId': null,
  'publicFormId': 'public-form-123456789012',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'activeVersionId': '${formId}_v2',
  'draftRevision': 2,
  'publishedVersion': 2,
  'submittedResponseCount': 3,
  'consequences': const <String, Object?>{},
  'updatedAtMillis': 1,
  'publishedAtMillis': 1,
  'lastResponseAtMillis': 1,
};

Map<String, Object?> _filters(String versionId, String label) => {
  'organizerId': 'org',
  'formId': 'form',
  'versionId': versionId,
  'formVersion': int.parse(versionId.split('_v').last),
  'version': 1,
  'answerFilterOptions': [
    {
      'questionId': 'pace',
      'label': label,
      'options': [
        {'value': 'easy', 'label': 'Easy'},
      ],
    },
  ],
};

void main() {
  late FakeFirebaseFirestore db;
  late HostResponseSummaryReads reads;

  Future<void> entry(
    String id,
    int at, {
    String formId = 'form',
    String version = 'form_v2',
    String? reviewStatus,
  }) => db.collection('hostResponseSummaries').doc(id).set({
    'organizerId': 'org',
    'version': 1,
    'kind': 'response',
    'formId': formId,
    'submittedAtMillis': at,
    'reviewStatus': ?reviewStatus,
    'row': {
      'entryId': 'response:$id',
      'submittedAtMillis': at,
      'response': _response(id, at, formId, version),
      'application': null,
    },
  });

  HostFormResponseListRequest request({
    String? versionId,
    HostApplicationReviewStatus? reviewStatus,
  }) => HostFormResponseListRequest(
    organizerId: 'org',
    formId: 'form',
    versionId: versionId,
    includeApplications: true,
    reviewStatus: reviewStatus,
  );

  setUp(() async {
    db = FakeFirebaseFirestore();
    reads = HostResponseSummaryReads(
      HostSummaryReader(db, actorId: () => 'host'),
    );
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'responseSummaryVersion': 1,
      'formSummaryVersion': 1,
    });
    await db.collection('hostFormSummaries').doc('form').set({
      'organizerId': 'org',
      'formId': 'form',
      'updatedAtMillis': 1,
      'status': 'published',
      'purpose': 'survey',
      'row': _formRow('form'),
      'version': 1,
    });
    await db
        .collection('hostFormVersionFilters')
        .doc('form_v1')
        .set(_filters('form_v1', 'Pace then'));
    await db
        .collection('hostFormVersionFilters')
        .doc('form_v2')
        .set(_filters('form_v2', 'Pace now'));
    await entry('a', 1000, version: 'form_v1');
    await entry('b', 2000, reviewStatus: 'approved');
    await entry('c', 3000);
    await entry('other', 4000, formId: 'other', version: 'other_v1');
  });

  test(
    'a form page reads its entries, version scope and active filters',
    () async {
      expect(HostResponseSummaryReads.supports(request()), isTrue);
      final page = await reads.list(request());

      expect(page.entries!.map((entry) => entry.entryId), [
        'response:c',
        'response:b',
        'response:a',
      ]);
      expect(page.versionScope!.activeVersionId, 'form_v2');
      expect(page.versionScope!.publishedVersion, 2);
      expect(page.answerFilterOptions.single.label, 'Pace now');
      expect(page.answerFilterOptions.single.options, {'easy': 'Easy'});
    },
  );

  test('a selected version reads its entries and its own filters', () async {
    final page = await reads.list(request(versionId: 'form_v1'));

    expect(page.entries!.map((entry) => entry.entryId), ['response:a']);
    expect(page.answerFilterOptions.single.label, 'Pace then');
  });

  test('a review status narrows the form page', () async {
    final page = await reads.list(
      request(
        versionId: 'form_v2',
        reviewStatus: HostApplicationReviewStatus.approved,
      ),
    );

    expect(page.entries!.map((entry) => entry.entryId), ['response:b']);
  });

  test('a form without a summary has no version scope or filters', () async {
    final page = await reads.list(
      const HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'other',
        includeApplications: true,
      ),
    );

    expect(page.entries!.map((entry) => entry.entryId), ['response:other']);
    expect(page.versionScope, isNull);
    expect(page.answerFilterOptions, isEmpty);
  });

  test('a version whose view is not written yet has no filters', () async {
    await db.collection('hostFormVersionFilters').doc('form_v2').delete();

    final page = await reads.list(request());

    expect(page.versionScope!.activeVersionId, 'form_v2');
    expect(page.answerFilterOptions, isEmpty);
  });

  test('answer, contact and text filters keep the callable', () {
    expect(
      HostResponseSummaryReads.supports(
        const HostFormResponseListRequest(
          organizerId: 'org',
          formId: 'form',
          includeApplications: true,
          answerFilters: {
            'pace': {'easy'},
          },
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
          contactId: 'contact',
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
          query: 'asha',
        ),
      ),
      isFalse,
    );
    expect(
      HostResponseSummaryReads.supports(
        const HostFormResponseListRequest(organizerId: 'org', formId: 'form'),
      ),
      isFalse,
      reason: 'A form page without applications keeps the callable.',
    );
    expect(
      HostResponseSummaryReads.supports(
        const HostFormResponseListRequest(
          organizerId: 'org',
          versionId: 'form_v1',
          includeApplications: true,
        ),
      ),
      isFalse,
      reason: 'A version belongs to a form.',
    );
  });
}
