import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_profile_draft.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';
import 'onboarding_test_helpers.dart';

class _CountingDraftRepository extends FakeOnboardingDraftRepository {
  int fetchCount = 0;

  @override
  Future<OnboardingDraft?> fetchDraft({required String uid}) {
    fetchCount += 1;
    return super.fetchDraft(uid: uid);
  }
}

// Capture real retained-error state, then dispose before returning the snapshot.
Future<AsyncValue<UserProfile?>> _profileFailureAfterData(
  UserProfile? previous,
) async {
  var pending = Completer<UserProfile?>();
  final provider = FutureProvider<UserProfile?>((ref) => pending.future);
  final container = ProviderContainer(retry: (_, _) => null);
  try {
    container.listen(provider, (_, _) {});
    pending.complete(previous);
    await container.read(provider.future);
    pending = Completer<UserProfile?>();
    container.invalidate(provider);
    final failed = container.read(provider.future);
    pending.completeError(StateError('profile unavailable'), StackTrace.empty);
    await expectLater(failed, throwsStateError);
    final snapshot = container.read(provider);
    expect(
      (
        snapshot.hasValue,
        snapshot.isLoading,
        snapshot.hasError,
        snapshot.value,
      ),
      (true, false, true, previous),
    );
    expect(snapshot.error, isStateError);
    return snapshot;
  } finally {
    container.dispose();
  }
}

void main() {
  group('OnboardingController.initStep', () {
    final failure = AsyncError<UserProfile?>(
      StateError('profile unavailable'),
      StackTrace.empty,
    );
    for (final label in [
      'loading',
      'initial error',
      'cached absence with error',
    ]) {
      test(
        '$label does not fetch a draft or initialize a new profile',
        () async {
          final profile = switch (label) {
            'loading' => const AsyncLoading<UserProfile?>(),
            'initial error' => failure,
            _ => await _profileFailureAfterData(null),
          };
          final repository = FakeAuthRepository()
            ..currentUserValue = TestUser(
              uid: 'runner-1',
              phoneNumber: '+919876543210',
            );
          final draftRepository = _CountingDraftRepository();
          final container = createOnboardingTestContainer(
            overrides: [
              authRepositoryProvider.overrideWithValue(repository),
              uidProvider.overrideWithValue(const AsyncData('runner-1')),
              watchUserProfileProvider.overrideWithValue(profile),
              onboardingDraftRepositoryProvider.overrideWithValue(
                draftRepository,
              ),
            ],
          );
          addTearDown(repository.dispose);
          addTearDown(container.dispose);
          final before = container.read(onboardingControllerProvider);

          await container
              .read(onboardingControllerProvider.notifier)
              .initStep();

          expect(draftRepository.fetchCount, 0);
          expect(container.read(onboardingControllerProvider), before);
        },
      );
    }

    test(
      'cached profile identity survives a failed refresh on entry',
      () async {
        final profile = buildUser().copyWith(profileComplete: false);
        final retainedError = await _profileFailureAfterData(profile);
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(uid: profile.uid);
        final draftRepository = _CountingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            uidProvider.overrideWithValue(AsyncData(profile.uid)),
            watchUserProfileProvider.overrideWithValue(retainedError),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);

        await container
            .read(onboardingControllerProvider.notifier)
            .initStep(profileCompletionOnly: true);

        final state = container.read(onboardingControllerProvider);
        expect(state.step, OnboardingStep.photos);
        expect(state.firstName, profile.firstName);
        expect(state.dateOfBirth, profile.dateOfBirth);
        expect(state.phoneVerified, isTrue);
        expect(draftRepository.fetchCount, 0);
      },
    );

    test('starts on the welcome step for signed-out users', () async {
      final repository = FakeAuthRepository();
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      await container.read(onboardingControllerProvider.notifier).initStep();

      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.welcome,
      );
    });

    test(
      'jumps to the profile step and reuses auth phone when no profile exists',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(
            uid: 'runner-1',
            phoneNumber: '+919876543210',
          );
        final draftRepository = FakeOnboardingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        await container.read(onboardingControllerProvider.notifier).initStep();

        expect(
          container.read(onboardingControllerProvider),
          const OnboardingData(
            step: OnboardingStep.nameDob,
            phoneVerified: true,
            profileDraft: OnboardingProfileDraft(phoneNumber: '9876543210'),
          ),
        );
      },
    );

    test(
      'starts social completion at photos for booking-ready profiles',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(uid: 'runner-1');
        final draftRepository = FakeOnboardingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith(
              (ref) =>
                  Stream.value(buildUser().copyWith(profileComplete: false)),
            ),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        await container
            .read(onboardingControllerProvider.notifier)
            .initStep(profileCompletionOnly: true);

        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.photos,
        );
      },
    );

    test('starts run preference completion at the running step', () async {
      final repository = FakeAuthRepository()
        ..currentUserValue = TestUser(uid: 'runner-1', phoneNumber: '+91');
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(
              buildUser(
                runPreferencesVersion: 0,
              ).copyWith(activityPreferences: const ActivityPreferences()),
            ),
          ),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      await container
          .read(onboardingControllerProvider.notifier)
          .initStep(runPreferencesOnly: true);

      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.runningPrefs,
      );
    });

    test('starts at welcome for signed-in users without a phone', () async {
      final repository = FakeAuthRepository()
        ..currentUserValue = TestUser(uid: 'runner-1');
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      await container.read(onboardingControllerProvider.notifier).initStep();

      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.welcome,
      );
    });

    test(
      'does not resume a persisted draft when the signed-in user has no phone',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(uid: 'runner-1');
        final draftRepository = FakeOnboardingDraftRepository()
          ..draft = OnboardingDraft(
            step: OnboardingStep.genderInterest.index,
            firstName: 'Asha',
            lastName: 'Runner',
            dateOfBirth: DateTime(1997, 4, 15),
            phoneNumber: '9876543210',
            gender: Gender.woman,
            interestedInGenders: const [Gender.man],
          );
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        await container.read(onboardingControllerProvider.notifier).initStep();

        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.welcome,
        );
        expect(
          container.read(onboardingControllerProvider).phoneVerified,
          false,
        );
      },
    );

    test(
      'clamps old social-step drafts to the booking identity flow',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(
            uid: 'runner-1',
            phoneNumber: '+919876543210',
          );
        final draftRepository = FakeOnboardingDraftRepository()
          ..draft = OnboardingDraft(
            step: OnboardingStep.photos.index,
            draftVersion: 2,
            firstName: 'Asha',
            lastName: 'Runner',
            dateOfBirth: DateTime(1997, 4, 15),
            phoneNumber: '9876543210',
            gender: Gender.woman,
            interestedInGenders: const [Gender.man],
          );
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        await container.read(onboardingControllerProvider.notifier).initStep();

        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.nameDob,
        );
        expect(container.read(onboardingControllerProvider).firstName, 'Asha');
      },
    );
  });

  group('OnboardingController.saveProfile', () {
    test(
      'deduplicates an active save and freezes controller-owned draft state',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(
            uid: 'runner-1',
            phoneNumber: '+919876543210',
          );
        final userProfileRepository = _GatedSetUserProfileRepository();
        final draftRepository = FakeOnboardingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            userProfileRepositoryProvider.overrideWith(
              (ref) => userProfileRepository,
            ),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        final notifier = container.read(onboardingControllerProvider.notifier);
        await notifier.initStep();
        notifier
          ..setNameDob(
            firstName: 'Asha',
            lastName: 'Runner',
            dateOfBirth: DateTime(1997, 4, 15),
            phoneNumber: '9876543210',
            countryCode: '+91',
          )
          ..setGenderInterest(
            gender: Gender.woman,
            interestedInGenders: const [Gender.man],
          )
          ..goToStep(OnboardingStep.genderInterest);

        final firstRequest = notifier.saveProfile();
        await flushTestEventQueue();
        notifier
          ..setGenderInterest(
            gender: Gender.man,
            interestedInGenders: const [Gender.woman],
          )
          ..goToStep(OnboardingStep.nameDob);
        final duplicateRequest = notifier.saveProfile();

        expect(identical(firstRequest, duplicateRequest), isTrue);
        expect(userProfileRepository.setCallCount, 1);
        expect(
          container.read(onboardingControllerProvider).gender,
          Gender.woman,
        );
        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.genderInterest,
        );

        userProfileRepository.gate.complete();
        await Future.wait([firstRequest, duplicateRequest]);
        expect(userProfileRepository.setCallCount, 1);
      },
    );

    test('throws when the user is no longer signed in', () async {
      final repository = FakeAuthRepository();
      final userProfileRepository = FakeOnboardingUserProfileRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      final notifier = container.read(onboardingControllerProvider.notifier);
      notifier.setNameDob(
        firstName: 'Asha',
        lastName: 'Runner',
        dateOfBirth: DateTime(1997, 4, 15),
        phoneNumber: '9876543210',
        countryCode: '+91',
      );
      notifier.setGenderInterest(
        gender: Gender.woman,
        interestedInGenders: const [Gender.man],
      );

      await expectLater(
        notifier.saveProfile(),
        throwsA(isA<SignInRequiredException>()),
      );
      expect(userProfileRepository.lastSavedUser, isNull);
    });

    test(
      'persists booking-ready identity without advancing to social steps',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(
            uid: 'runner-1',
            phoneNumber: '+919876543210',
          );
        final userProfileRepository = FakeOnboardingUserProfileRepository();
        final draftRepository = FakeOnboardingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            userProfileRepositoryProvider.overrideWith(
              (ref) => userProfileRepository,
            ),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        final notifier = container.read(onboardingControllerProvider.notifier);
        await notifier.initStep();
        notifier.setNameDob(
          firstName: 'Asha',
          lastName: 'Runner',
          dateOfBirth: DateTime(1997, 4, 15),
          phoneNumber: '9876543210',
          countryCode: '+91',
        );
        notifier.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        notifier.goToStep(OnboardingStep.genderInterest);

        await notifier.saveProfile();

        expect(userProfileRepository.lastSavedUser, isNotNull);
        expect(userProfileRepository.lastSavedUser!.uid, 'runner-1');
        expect(userProfileRepository.lastSavedUser!.email, isEmpty);
        expect(userProfileRepository.lastSavedUser!.name, 'Asha Runner');
        expect(userProfileRepository.lastSavedUser!.displayName, 'Asha');
        expect(
          userProfileRepository.lastSavedUser!.phoneNumber,
          '+919876543210',
        );
        expect(userProfileRepository.lastSavedUser!.profileComplete, isFalse);
        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.genderInterest,
        );
        expect(draftRepository.draft, isNull);
      },
    );

    test('social identity rejects missing interested-in genders', () async {
      final repository = FakeAuthRepository()
        ..currentUserValue = TestUser(
          uid: 'runner-1',
          phoneNumber: '+919876543210',
        );
      final userProfileRepository = FakeOnboardingUserProfileRepository();
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      final notifier = container.read(onboardingControllerProvider.notifier);
      await notifier.initStep();
      notifier
        ..setNameDob(
          firstName: 'Asha',
          lastName: 'Runner',
          dateOfBirth: DateTime(1997, 4, 15),
          phoneNumber: '9876543210',
          countryCode: '+91',
        )
        ..setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [],
        );

      await expectLater(
        notifier.saveProfile(socialIdentityOnly: true),
        throwsA(isA<ValidationException>()),
      );

      expect(userProfileRepository.lastSavedUser, isNull);
    });

    test(
      'stays on gender preferences when profile persistence fails',
      () async {
        final repository = FakeAuthRepository()
          ..currentUserValue = TestUser(
            uid: 'runner-1',
            phoneNumber: '+919876543210',
          );
        final userProfileRepository = _FailingSetUserProfileRepository();
        final draftRepository = FakeOnboardingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            userProfileRepositoryProvider.overrideWith(
              (ref) => userProfileRepository,
            ),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        final notifier = container.read(onboardingControllerProvider.notifier);
        await notifier.initStep();
        notifier
          ..setNameDob(
            firstName: 'Asha',
            lastName: 'Runner',
            dateOfBirth: DateTime(1997, 4, 15),
            phoneNumber: '9876543210',
            countryCode: '+91',
          )
          ..setGenderInterest(
            gender: Gender.woman,
            interestedInGenders: const [Gender.man],
          )
          ..goToStep(OnboardingStep.genderInterest);

        await expectLater(notifier.saveProfile(), throwsA(isA<StateError>()));

        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.genderInterest,
        );
        expect(draftRepository.draft, isNull);
      },
    );
  });

  group('OnboardingController.completeRunPreferences', () {
    test('deduplicates an active completion request', () async {
      final repository = FakeAuthRepository();
      final userProfileRepository = _GatedUpdateUserProfileRepository(
        currentUser: buildUser().copyWith(profileComplete: false),
      );
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser().copyWith(profileComplete: false)),
          ),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);
      final notifier = container.read(onboardingControllerProvider.notifier)
        ..goToStep(OnboardingStep.runningPrefs);

      final firstRequest = notifier.completeRunPreferences(
        paceMinSecsPerKm: 305,
        paceMaxSecsPerKm: 355,
        preferredDistances: const [PreferredDistance.tenK],
        runningReasons: const [RunReason.community],
        preferredRunTimes: const [PreferredRunTime.morning],
      );
      await flushTestEventQueue();
      notifier.goToStep(OnboardingStep.welcome);
      final duplicateRequest = notifier.completeRunPreferences(
        paceMinSecsPerKm: 400,
        paceMaxSecsPerKm: 500,
        preferredDistances: const [],
        runningReasons: const [],
        preferredRunTimes: const [],
      );

      expect(identical(firstRequest, duplicateRequest), isTrue);
      expect(userProfileRepository.updateCallCount, 1);
      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.runningPrefs,
      );

      userProfileRepository.gate.complete();
      await Future.wait([firstRequest, duplicateRequest]);
      expect(userProfileRepository.updateCallCount, 1);
      expect(userProfileRepository.lastSavedUser?.paceMinSecsPerKm, 305);
    });

    test('throws when the latest profile is unavailable', () async {
      final repository = FakeAuthRepository();
      final userProfileRepository = FakeOnboardingUserProfileRepository();
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      await expectLater(
        container
            .read(onboardingControllerProvider.notifier)
            .completeRunPreferences(
              paceMinSecsPerKm: 300,
              paceMaxSecsPerKm: 360,
              preferredDistances: const [PreferredDistance.tenK],
              runningReasons: const [RunReason.community],
              preferredRunTimes: const [PreferredRunTime.morning],
            ),
        throwsA(isA<DocumentNotFoundException>()),
      );
    });

    test(
      'saves running preferences without changing social completion',
      () async {
        final repository = FakeAuthRepository();
        final userProfileRepository = FakeOnboardingUserProfileRepository(
          currentUser: buildUser().copyWith(profileComplete: false),
        );
        final draftRepository = FakeOnboardingDraftRepository();
        final container = createOnboardingTestContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(repository),
            userProfileRepositoryProvider.overrideWith(
              (ref) => userProfileRepository,
            ),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith(
              (ref) =>
                  Stream.value(buildUser().copyWith(profileComplete: false)),
            ),
            onboardingDraftRepositoryProvider.overrideWithValue(
              draftRepository,
            ),
          ],
        );
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        await primeOnboardingAsyncProviders(container);

        await container
            .read(onboardingControllerProvider.notifier)
            .completeRunPreferences(
              paceMinSecsPerKm: 305,
              paceMaxSecsPerKm: 355,
              preferredDistances: const [PreferredDistance.tenK],
              runningReasons: const [RunReason.community, RunReason.social],
              preferredRunTimes: const [
                PreferredRunTime.morning,
                PreferredRunTime.evening,
              ],
            );

        expect(userProfileRepository.lastSavedUser, isNotNull);
        expect(userProfileRepository.lastSavedUser!.paceMinSecsPerKm, 305);
        expect(userProfileRepository.lastSavedUser!.paceMaxSecsPerKm, 355);
        expect(userProfileRepository.lastSavedUser!.preferredDistances, const [
          PreferredDistance.tenK,
        ]);
        expect(userProfileRepository.lastSavedUser!.runningReasons, const [
          RunReason.community,
          RunReason.social,
        ]);
        expect(userProfileRepository.lastSavedUser!.preferredRunTimes, const [
          PreferredRunTime.morning,
          PreferredRunTime.evening,
        ]);
        expect(
          userProfileRepository.lastSavedUser!.runPreferencesVersion,
          currentRunPreferencesVersion,
        );
        expect(userProfileRepository.lastSavedUser!.profileComplete, isFalse);
      },
    );
  });

  group('OnboardingController.completeSocialProfile', () {
    test('saves prompts and marks the social profile complete', () async {
      final repository = FakeAuthRepository();
      final userProfileRepository = FakeOnboardingUserProfileRepository(
        currentUser: buildUser().copyWith(profileComplete: false),
      );
      final draftRepository = FakeOnboardingDraftRepository();
      final container = createOnboardingTestContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser().copyWith(profileComplete: false)),
          ),
          onboardingDraftRepositoryProvider.overrideWithValue(draftRepository),
        ],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await primeOnboardingAsyncProviders(container);

      final prompts = [
        for (final promptId in defaultProfilePromptIds)
          ProfilePromptAnswer(
            promptId: promptId,
            prompt: profilePromptTitle(promptId),
            answer: 'Answer for $promptId.',
          ),
      ];

      await container
          .read(onboardingControllerProvider.notifier)
          .completeSocialProfile(prompts: prompts);

      expect(userProfileRepository.lastSavedUser, isNotNull);
      expect(userProfileRepository.lastSavedUser!.profileComplete, isTrue);
      expect(userProfileRepository.lastSavedUser!.profilePrompts, prompts);
    });
  });
}

class _FailingSetUserProfileRepository
    extends FakeOnboardingUserProfileRepository {
  @override
  Future<void> setUserProfile({required UserProfile userProfile}) async {
    throw StateError('write failed');
  }
}

class _GatedSetUserProfileRepository
    extends FakeOnboardingUserProfileRepository {
  final gate = Completer<void>();
  int setCallCount = 0;

  @override
  Future<void> setUserProfile({required UserProfile userProfile}) async {
    setCallCount += 1;
    await gate.future;
    await super.setUserProfile(userProfile: userProfile);
  }
}

class _GatedUpdateUserProfileRepository
    extends FakeOnboardingUserProfileRepository {
  _GatedUpdateUserProfileRepository({required super.currentUser});

  final gate = Completer<void>();
  int updateCallCount = 0;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {
    updateCallCount += 1;
    await gate.future;
    await super.updateUserProfile(uid: uid, patch: patch, action: action);
  }
}
