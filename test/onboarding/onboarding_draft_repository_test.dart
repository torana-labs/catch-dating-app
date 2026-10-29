import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('OnboardingDraftRepository', () {
    late FakeFirebaseFirestore firestore;
    late OnboardingDraftRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = OnboardingDraftRepository(firestore);
    });

    test('fetchDraft returns null when no draft exists', () async {
      expect(await repository.fetchDraft(uid: 'runner-1'), isNull);
    });

    test('saveDraft persists the draft under the user id', () async {
      final draft = buildDraft();

      await repository.saveDraft(uid: 'runner-1', draft: draft);

      final stored = await repository.fetchDraft(uid: 'runner-1');
      expect(stored, draft);
    });

    test('saveDraft replaces an existing draft', () async {
      await repository.saveDraft(uid: 'runner-1', draft: buildDraft(step: 1));

      final replacement = buildDraft(
        step: 4,
        firstName: 'Maya',
        lastName: 'Shah',
      );
      await repository.saveDraft(uid: 'runner-1', draft: replacement);

      expect(await repository.fetchDraft(uid: 'runner-1'), replacement);
    });

    test('deleteDraft removes the draft document', () async {
      await repository.saveDraft(uid: 'runner-1', draft: buildDraft());

      await repository.deleteDraft(uid: 'runner-1');

      expect(await repository.fetchDraft(uid: 'runner-1'), isNull);
    });

    test('provider builds from firebaseFirestoreProvider', () async {
      final container = ProviderContainer(
        overrides: [firebaseFirestoreProvider.overrideWithValue(firestore)],
      );
      addTearDown(container.dispose);

      final providerRepository = container.read(
        onboardingDraftRepositoryProvider,
      );
      final draft = buildDraft();

      await providerRepository.saveDraft(uid: 'runner-1', draft: draft);

      expect(await providerRepository.fetchDraft(uid: 'runner-1'), draft);
    });
  });
}

OnboardingDraft buildDraft({
  int step = 3,
  int draftVersion = 1,
  String firstName = 'Asha',
  String lastName = 'Runner',
  DateTime? dateOfBirth,
  String phoneNumber = '9876543210',
  String countryCode = '+91',
}) {
  return OnboardingDraft(
    step: step,
    draftVersion: draftVersion,
    firstName: firstName,
    lastName: lastName,
    dateOfBirth: dateOfBirth ?? DateTime(1997, 4, 15),
    phoneNumber: phoneNumber,
    countryCode: countryCode,
    gender: Gender.woman,
    interestedInGenders: const [Gender.man],
    instagramHandle: '@asha_events',
  );
}
