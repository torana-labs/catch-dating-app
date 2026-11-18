import 'package:catch_dating_app/contexts/forms/data/read_models/host_response_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _response(
  String id,
  int at, {
  required String formId,
  required String status,
}) => {
  'responseId': id,
  'formId': formId,
  'formTitle': 'Survey',
  'versionId': 'version',
  'version': 1,
  'status': status,
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
  'withdrawnAtMillis': status == 'withdrawn' ? at + 1 : null,
  'highlights': const <Object?>[],
  'conversionKinds': const <Object?>[],
};

/// The form builder Overview's latest submitted answer.
const _latestSubmitted = HostFormResponseListRequest(
  organizerId: 'org',
  formId: 'form',
  statuses: {HostFormResponseStatus.submitted},
  limit: 1,
);

void main() {
  late FakeFirebaseFirestore db;
  late HostResponseSummaryReads reads;

  Future<void> response(
    String id,
    int at, {
    String formId = 'form',
    String status = 'submitted',
  }) => db.collection('hostResponseSummaries').doc(id).set({
    'organizerId': 'org',
    'version': 1,
    'kind': 'response',
    'formId': formId,
    'submittedAtMillis': at,
    'row': {
      'entryId': 'response:$id',
      'submittedAtMillis': at,
      'response': _response(id, at, formId: formId, status: status),
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
    await response('old', 1000);
    await response('withdrawn', 3000, status: 'withdrawn');
    await response('other-form', 4000, formId: 'other');
    await response('latest', 2000);
  });

  test('one form and one response status read from the summaries', () {
    expect(HostResponseSummaryReads.supports(_latestSubmitted), isTrue);
  });

  test('other status shapes keep the callable', () {
    for (final request in [
      const HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'form',
        statuses: {
          HostFormResponseStatus.submitted,
          HostFormResponseStatus.withdrawn,
        },
      ),
      const HostFormResponseListRequest(
        organizerId: 'org',
        statuses: {HostFormResponseStatus.submitted},
      ),
      const HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'form',
        includeApplications: true,
        statuses: {HostFormResponseStatus.submitted},
      ),
      const HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'form',
        oldestFirst: true,
        statuses: {HostFormResponseStatus.submitted},
      ),
      const HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'version',
        statuses: {HostFormResponseStatus.submitted},
      ),
    ]) {
      expect(HostResponseSummaryReads.supports(request), isFalse);
    }
  });

  test('the latest submitted answer is the newest of its form', () async {
    final window = await reads
        .watchPages(_latestSubmitted, pageSize: _latestSubmitted.limit)
        .pages
        .first;

    expect(window.items.map((item) => item.response?.responseId), ['latest']);
    expect(window.hasMore, isTrue);
  });

  test('the next page opens after the last row shown', () async {
    final pager = reads.watchPages(_latestSubmitted, pageSize: 1);
    final shown = <List<String?>>[];
    final hasMore = <bool>[];
    final subscription = pager.pages.listen((pages) {
      shown.add(pages.items.map((item) => item.response?.responseId).toList());
      hasMore.add(pages.hasMore);
    });
    addTearDown(subscription.cancel);
    await pumpEventQueue();
    expect(shown.last, ['latest']);
    expect(hasMore.last, isTrue);

    pager.loadMore();
    await pumpEventQueue();
    expect(shown.last, ['latest', 'old']);
    expect(hasMore.last, isFalse);
  });

  test('a newer submitted answer shows at once', () async {
    final latest = reads
        .watchPages(_latestSubmitted, pageSize: 1)
        .pages
        .map((pages) => pages.items.single.response?.responseId);
    final expectation = expectLater(latest, emitsInOrder(['latest', 'new']));
    await pumpEventQueue();
    await response('new', 5000);
    await expectation;
  });
}
