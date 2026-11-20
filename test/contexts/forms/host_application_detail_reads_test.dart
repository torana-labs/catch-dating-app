import 'package:catch_dating_app/contexts/forms/data/host_application_detail_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

Map<String, Object?> _detail({String reviewStatus = 'submitted'}) => {
  'organizerId': 'org-1',
  'applicationId': 'app-1',
  'contactId': null,
  'sourceResponseId': 'resp-1',
  'formId': 'form-1',
  'formVersionId': 'version-1',
  'targetKind': 'organizer',
  'targetId': null,
  'applicantDisplayName': 'Ada',
  'reviewStatus': reviewStatus,
  'dataAccessState': 'submittedFormResponse',
  'answers': <Object?>[],
  'outreach': {
    'phoneE164': '+12025550101',
    'email': null,
    'instagramUrl': 'https://www.instagram.com/synthetic_demo/',
    'linkedinUrl': null,
  },
  'reviewNote': null,
  'assignedReviewerUid': null,
  'submittedAtMillis': 1790000000000,
  'reviewedAtMillis': null,
  'revision': 1,
  'communityMembership': {'uid': 'user-1', 'state': 'none', 'revision': 0},
};

void main() {
  test('one application reads its view live, in the callable shape', () async {
    final db = FakeFirebaseFirestore();
    final ref = db.collection(HostApplicationDetailReads.views).doc('app-1');
    await ref.set({
      'organizerId': 'org-1',
      'applicationId': 'app-1',
      'detail': _detail(),
      'version': 1,
    });
    final details = HostApplicationRepository(
      _NoFunctions(),
      detail: HostApplicationDetailReads(db),
    ).watchApplicationDetail('org-1', 'app-1');
    final first = await details.first;
    expect(first.applicantDisplayName, 'Ada');
    expect(first.reviewStatus, HostApplicationReviewStatus.submitted);
    expect(first.outreach.phoneE164, '+12025550101');
    expect(first.communityMembership?.uid, 'user-1');

    final later = details.skip(1).first;
    await ref.update({'detail': _detail(reviewStatus: 'approved')});
    expect((await later).reviewStatus, HostApplicationReviewStatus.approved);
  });

  test('a missing or foreign view is reported missing', () async {
    final db = FakeFirebaseFirestore();
    final reads = HostApplicationDetailReads(db);
    await expectLater(reads.watch('org-1', 'app-1').first, throwsA(anything));
    await db.collection(HostApplicationDetailReads.views).doc('app-2').set({
      'organizerId': 'org-2',
      'applicationId': 'app-2',
      'detail': _detail(),
      'version': 1,
    });
    await expectLater(reads.watch('org-1', 'app-2').first, throwsA(anything));
  });
}
