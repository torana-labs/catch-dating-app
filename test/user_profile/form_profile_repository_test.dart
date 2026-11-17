import 'package:catch_dating_app/contexts/profiles/data/form_profile_repository.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/contract_schemas.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

Map<String, Object?> _view(
  String uid, {
  List<String> selected = const [],
  int? claimedAtMillis,
}) => {
  'uid': uid,
  'organizerId': 'org',
  'formId': 'form',
  'formTitle': 'Application',
  'submittedAtMillis': 1000,
  'claimedAtMillis': claimedAtMillis,
  'fields': [
    {
      'questionId': 'cocktail',
      'destination': 'organizerCard',
      'canonicalFieldId': null,
      'label': 'Cocktail',
      'kind': 'shortText',
      'value': 'Tequila',
      'options': <Object?>[],
      'eventProfileEligible': true,
    },
  ],
  'selectedCardQuestionIds': selected,
  'cardRevision': selected.isEmpty ? 0 : 1,
  'termsVersion': 'form-profile-claim-v1',
  'version': 1,
};

void main() {
  late FakeFirebaseFirestore db;
  late FormProfileRepository repository;
  setUp(() {
    db = FakeFirebaseFirestore();
    repository = FormProfileRepository(_NoFunctions(), db);
  });

  test('lists only the guest\'s own rows, one page at a time', () async {
    for (var i = 0; i < 22; i++) {
      await db
          .collection('participantFormProfileViews')
          .doc('r${i.toString().padLeft(2, '0')}')
          .set(_view('person', selected: i == 0 ? ['cocktail'] : []));
    }
    await db
        .collection('participantFormProfileViews')
        .doc('other')
        .set(_view('someone-else'));
    final page = await repository.list('person');
    expect(page.items, hasLength(FormProfileRepository.pageSize));
    expect(page.items.first.responseId, 'r00');
    expect(page.items.first.cardFieldCount, 1);
    expect(page.items.first.organizerName, isNull);
    expect(page.items[1].cardFieldCount, 0);
    expect(page.nextCursor, 'r19');
    expect(page.items.map((row) => row.responseId), isNot(contains('other')));
  });

  test(
    'the review combines the row, the profile and the intake view',
    () async {
      await db
          .collection('participantFormProfileViews')
          .doc('r1')
          .set(_view('person', selected: ['cocktail'], claimedAtMillis: 2000));
      await db.collection('users').doc('person').set({
        'profileRevision': 4,
        'displayName': 'Sara',
        'gender': 'woman',
        'dateOfBirth': Timestamp.fromDate(DateTime.utc(1994, 6, 15)),
        'prefsShowOnMap': false,
        'phoneNumber': '+919000000001',
      });
      await db.collection('participantIntakeProfileViews').doc('person').set({
        'uid': 'person',
        'intakeRevision': 3,
        'linkedinUrl': 'https://www.linkedin.com/in/sara',
        'version': 1,
      });
      final review = await repository.watchReview('person', 'r1').first;
      expect(review.profileRevision, 4);
      expect(review.intakeRevision, 3);
      expect(review.currentLinkedinUrl, 'https://www.linkedin.com/in/sara');
      expect(review.currentProfile, {
        'displayName': 'Sara',
        'gender': 'woman',
        'dateOfBirth': '1994-06-15',
      });
      expect(review.selectedCardQuestionIds, {'cocktail'});
      expect(review.cardRevision, 1);
      expect(review.claimedAt, DateTime.fromMillisecondsSinceEpoch(2000));
      expect(review.fields.single.eventProfileEligible, isTrue);
      expect(review.termsVersion, 'form-profile-claim-v1');
    },
  );

  test(
    'a guest with no profile or intake view starts from revision 0',
    () async {
      await db
          .collection('participantFormProfileViews')
          .doc('r1')
          .set(_view('person'));
      final review = await repository.watchReview('person', 'r1').first;
      expect(review.profileRevision, 0);
      expect(review.intakeRevision, 0);
      expect(review.currentLinkedinUrl, isNull);
      expect(review.currentProfile, isNull);
    },
  );

  test('another guest\'s row or a deleted account is unavailable', () async {
    await db
        .collection('participantFormProfileViews')
        .doc('r1')
        .set(_view('someone-else'));
    await expectLater(
      repository.watchReview('person', 'r1').first,
      throwsA(isA<DocumentNotFoundException>()),
    );
    await db
        .collection('participantFormProfileViews')
        .doc('r2')
        .set(_view('person'));
    await db.collection('users').doc('person').set({'deleted': true});
    await expectLater(
      repository.watchReview('person', 'r2').first,
      throwsA(isA<DocumentNotFoundException>()),
    );
  });

  test('the reviewed profile keys match the claim payload contract', () {
    final schema = contractSchema('ClaimParticipantFormProfileCallablePayload');
    final profile =
        (schema['properties']! as Map)['profile']! as Map<String, Object?>;
    expect(
      FormProfileRepository.claimProfileKeys,
      (profile['properties']! as Map).keys.toSet(),
    );
  });
}
