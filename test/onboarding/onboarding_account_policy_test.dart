import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_name_dob_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_name_dob_step_state.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import 'onboarding_test_helpers.dart';

Future<ProviderContainer> accountContainer(
  FakeOnboardingUserProfileRepository profiles,
) async {
  final auth = FakeAuthRepository()
    ..currentUserValue = TestUser(
      uid: 'runner-1',
      phoneNumber: '+919876543210',
    );
  final container = createOnboardingTestContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(profiles.currentUser),
      ),
      userProfileRepositoryProvider.overrideWith((ref) => profiles),
      onboardingDraftRepositoryProvider.overrideWithValue(
        FakeOnboardingDraftRepository(),
      ),
    ],
  );
  addTearDown(container.dispose);
  addTearDown(auth.dispose);
  await primeOnboardingAsyncProviders(container);
  return container;
}

void main() {
  for (final birthday in <DateTime?>[
    null,
    DateTime(DateTime.now().year - 12),
  ]) {
    test(
      'account saves a single name and optional birthday $birthday',
      () async {
        final profiles = FakeOnboardingUserProfileRepository();
        final container = await accountContainer(profiles);
        final controller = container.read(
          onboardingControllerProvider.notifier,
        );
        await controller.initStep();
        controller.setNameDob(
          firstName: 'Asha',
          lastName: '',
          dateOfBirth: birthday,
          phoneNumber: '9876543210',
          countryCode: '+91',
        );
        await controller.saveProfile();
        final saved = profiles.lastSavedUser!;
        expect(saved.name, 'Asha');
        expect(saved.phoneNumber, '+919876543210');
        expect(saved.dateOfBirth, birthday);
        expect(saved.gender, isNull);
        expect(saved.interestedInGenders, isEmpty);
        expect(saved.profilePhotos, isEmpty);
        expect(saved.profileComplete, isFalse);
        expect(saved.prefsShowOnMap, isFalse);
        expect(saved.prefsNewCatches, isFalse);
        expect(saved.prefsWeeklyDigest, isFalse);
      },
    );
  }

  test('account switch rejects a stale profile draft before writing', () async {
    final profiles = FakeOnboardingUserProfileRepository();
    final container = await accountContainer(profiles);
    final controller = container.read(onboardingControllerProvider.notifier);
    await controller.initStep();
    controller.setNameDob(
      firstName: 'Asha',
      lastName: '',
      dateOfBirth: null,
      phoneNumber: '9876543210',
      countryCode: '+91',
    );
    (container.read(authRepositoryProvider) as FakeAuthRepository)
        .currentUserValue = TestUser(
      uid: 'other-account',
      phoneNumber: '+919111111111',
    );
    await expectLater(
      controller.saveProfile(),
      throwsA(isA<SignInRequiredException>()),
    );
    expect(profiles.lastSavedUser, isNull);
  });

  test('social entry asks for missing birthday before photos', () async {
    final profiles = FakeOnboardingUserProfileRepository(
      currentUser: buildUser().copyWith(
        dateOfBirth: null,
        gender: null,
        interestedInGenders: [],
        profileComplete: false,
      ),
    );
    final container = await accountContainer(profiles);
    await container
        .read(onboardingControllerProvider.notifier)
        .initStep(profileCompletionOnly: true);
    expect(
      container.read(onboardingControllerProvider).step,
      OnboardingStep.nameDob,
    );
  });

  test('social identity patches preserve the existing rich account', () async {
    final original = buildUser().copyWith(
      gender: null,
      interestedInGenders: [],
      profileComplete: false,
      email: 'asha@example.com',
      occupation: 'Designer',
      prefsWeeklyDigest: true,
    );
    final profiles = FakeOnboardingUserProfileRepository(currentUser: original);
    final container = await accountContainer(profiles);
    final controller = container.read(onboardingControllerProvider.notifier);
    await controller.initStep(profileCompletionOnly: true);
    expect(
      container.read(onboardingControllerProvider).step,
      OnboardingStep.genderInterest,
    );
    controller.setGenderInterest(
      gender: Gender.woman,
      interestedInGenders: [Gender.man],
    );
    await controller.saveProfile(socialIdentityOnly: true);
    expect(profiles.lastPatch!.keys.toSet(), {'gender', 'interestedInGenders'});
    expect(
      profiles.currentUser,
      original.copyWith(
        gender: Gender.woman,
        interestedInGenders: [Gender.man],
      ),
    );
    expect(
      container.read(onboardingControllerProvider).step,
      OnboardingStep.photos,
    );
  });

  test('social identity rejects a missing or underage birthday', () async {
    for (final birthday in <DateTime?>[
      null,
      DateTime(DateTime.now().year - 12),
    ]) {
      final profiles = FakeOnboardingUserProfileRepository(
        currentUser: buildUser().copyWith(dateOfBirth: birthday),
      );
      final container = await accountContainer(profiles);
      final controller = container.read(onboardingControllerProvider.notifier);
      await controller.initStep(profileCompletionOnly: true);
      await expectLater(
        controller.saveProfile(socialIdentityOnly: true),
        throwsA(isA<ValidationException>()),
      );
      expect(profiles.lastPatch, isNull);
    }
  });

  test('birthday form policy follows the requested capability', () {
    OnboardingNameDobState state({required bool social, DateTime? birthday}) =>
        OnboardingNameDobState.fromDraft(
          l10n: AppLocalizationsEn(),
          firstName: 'Asha',
          lastName: '',
          phoneNumber: '9876543210',
          countryCode: '+91',
          dateOfBirth: birthday,
          step: OnboardingStep.nameDob,
          today: DateTime(2026, 10, 19),
          profileCompletionOnly: social,
        );
    expect(state(social: false).validateDateOfBirth(), isNull);
    expect(state(social: false).validateLastName(''), isNull);
    expect(
      state(social: false, birthday: DateTime(2014)).validateDateOfBirth(),
      isNull,
    );
    expect(state(social: true).validateDateOfBirth(), isNotNull);
    expect(
      state(social: true, birthday: DateTime(2014)).validateDateOfBirth(),
      isNotNull,
    );
    expect(
      state(social: false, birthday: DateTime(2027)).validateDateOfBirth(),
      isNotNull,
    );
  });

  testWidgets(
    'name-only form creates account without asking social questions',
    (tester) async {
      final profiles = FakeOnboardingUserProfileRepository();
      final container = (await tester.runAsync(
        () => accountContainer(profiles),
      ))!;
      final controller = container.read(onboardingControllerProvider.notifier);
      await controller.initStep();
      controller.setNameDob(
        firstName: 'Asha',
        lastName: '',
        dateOfBirth: null,
        phoneNumber: '9876543210',
        countryCode: '+91',
      );
      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingNameDobBody(),
      );
      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);
      expect(profiles.lastSavedUser?.name, 'Asha');
      expect(profiles.lastSavedUser?.dateOfBirth, isNull);
      expect(find.text('Please select your date of birth'), findsNothing);
      expect(find.text('How do you identify?'), findsNothing);
    },
  );

  test(
    'event birthday completion preserves a minimal profile without social questions',
    () async {
      final original = buildUser().copyWith(
        dateOfBirth: null,
        gender: null,
        interestedInGenders: [],
        profileComplete: false,
      );
      final profiles = FakeOnboardingUserProfileRepository(
        currentUser: original,
      );
      final container = await accountContainer(profiles);
      final controller = container.read(onboardingControllerProvider.notifier);
      const requirements = ['ageRestricted'];
      await controller.initStep(
        profileCompletionOnly: true,
        eventRequirements: requirements,
      );
      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.nameDob,
      );
      final draft = container.read(onboardingControllerProvider);
      final birthday = DateTime(DateTime.now().year - 14);
      controller.setNameDob(
        firstName: draft.firstName,
        lastName: draft.lastName,
        phoneNumber: draft.phoneNumber,
        countryCode: draft.countryCode,
        dateOfBirth: birthday,
      );
      await controller.saveProfile(
        socialIdentityOnly: true,
        eventRequirements: requirements,
      );
      expect(profiles.lastPatch!.keys, ['dateOfBirth']);
      expect(profiles.currentUser, original.copyWith(dateOfBirth: birthday));
      expect(
        container.read(onboardingControllerProvider).step,
        isNot(OnboardingStep.photos),
      );
    },
  );

  test(
    'cohort-only event completion does not request or write a birthday',
    () async {
      final original = buildUser().copyWith(
        dateOfBirth: null,
        gender: null,
        interestedInGenders: [],
        profileComplete: false,
      );
      final profiles = FakeOnboardingUserProfileRepository(
        currentUser: original,
      );
      final container = await accountContainer(profiles);
      final controller = container.read(onboardingControllerProvider.notifier);
      const requirements = ['cohortRestricted'];
      await controller.initStep(
        profileCompletionOnly: true,
        eventRequirements: requirements,
      );
      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.genderInterest,
      );
      controller.setGenderInterest(
        gender: Gender.woman,
        interestedInGenders: [Gender.man],
      );
      await controller.saveProfile(
        socialIdentityOnly: true,
        eventRequirements: requirements,
      );
      expect(profiles.lastPatch!.keys.toSet(), {
        'gender',
        'interestedInGenders',
      });
      expect(profiles.currentUser?.dateOfBirth, isNull);
      expect(profiles.currentUser?.profileComplete, isFalse);
    },
  );

  test(
    'event completion resumes booking without requiring social readiness',
    () {
      final minimal = buildUser().copyWith(
        dateOfBirth: null,
        gender: null,
        interestedInGenders: [],
        profileComplete: false,
      );
      const destination = '/organizers/organizer-1/events/event-1';
      final location = profileCompletionLocation(
        from: destination,
        eventRequirements: ['ageRestricted'],
      );
      String? redirect(AsyncValue<UserProfile?> profile, {String? target}) {
        final uri = Uri.parse(target ?? location);
        return appRedirect(
          uidAsync: const AsyncData('runner-1'),
          userProfileAsync: profile,
          hasPendingAuthVerification: false,
          matchedLocation: uri.path,
          uri: uri,
        );
      }

      expect(redirect(AsyncData(minimal)), isNull);
      expect(
        redirect(AsyncData(minimal.copyWith(dateOfBirth: DateTime(2014)))),
        destination,
      );
      final accountStep = Uri.parse(redirect(const AsyncData(null))!);
      expect(accountStep.path, '/onboarding');
      expect(accountStep.queryParameters['intent'], isNull);
      expect(accountStep.queryParameters['from'], destination);
      final recovery = Uri.parse(
        redirect(AsyncError(StateError('offline'), StackTrace.empty))!,
      );
      expect(recovery.queryParameters['from'], destination);
      expect(recovery.queryParameters['eventRequirements'], 'ageRestricted');
      expect(
        redirect(AsyncData(minimal), target: recovery.toString()),
        location,
      );
      expect(
        redirect(
          AsyncData(minimal),
          target: profileCompletionLocation(from: '/catches/event-1'),
        ),
        isNull,
      );
    },
  );

  testWidgets(
    'age-only event form saves birthday and omits name and matching questions',
    (tester) async {
      final profiles = FakeOnboardingUserProfileRepository(
        currentUser: buildUser().copyWith(
          dateOfBirth: null,
          gender: null,
          interestedInGenders: [],
          profileComplete: false,
        ),
      );
      final container = (await tester.runAsync(
        () => accountContainer(profiles),
      ))!;
      final controller = container.read(onboardingControllerProvider.notifier);
      await controller.initStep(
        profileCompletionOnly: true,
        eventRequirements: ['ageRestricted'],
      );
      final draft = container.read(onboardingControllerProvider);
      controller.setNameDob(
        firstName: draft.firstName,
        lastName: draft.lastName,
        phoneNumber: draft.phoneNumber,
        countryCode: draft.countryCode,
        dateOfBirth: DateTime(2014),
      );
      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingNameDobBody(
          profileCompletionOnly: true,
          eventRequirements: ['ageRestricted'],
        ),
      );
      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);
      expect(profiles.lastPatch!.keys, ['dateOfBirth']);
      expect(find.text('Please select your gender'), findsNothing);
      expect(find.text('First name'), findsNothing);
    },
  );

  testWidgets('account save disables controls and shows retryable errors', (
    tester,
  ) async {
    final profiles = GatedAccountRepository();
    final container = (await tester.runAsync(
      () => accountContainer(profiles),
    ))!;
    final controller = container.read(onboardingControllerProvider.notifier);
    await controller.initStep();
    controller.setNameDob(
      firstName: 'Asha',
      lastName: '',
      dateOfBirth: null,
      phoneNumber: '9876543210',
      countryCode: '+91',
    );
    await pumpOnboardingPage(
      tester,
      container: container,
      child: const OnboardingNameDobBody(),
    );
    await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
    await pumpOnboardingUi(tester);
    expect(profiles.calls, 1);
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNull,
    );
    controller.setNameDob(
      firstName: 'Changed',
      lastName: '',
      dateOfBirth: null,
      phoneNumber: '9876543210',
      countryCode: '+91',
    );
    expect(container.read(onboardingControllerProvider).firstName, 'Asha');
    profiles.gate.completeError(const ValidationException('Please try again.'));
    await pumpOnboardingUi(tester);
    expect(find.byType(CatchBanner), findsOneWidget);
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNotNull,
    );
  });
}

class GatedAccountRepository extends FakeOnboardingUserProfileRepository {
  final gate = Completer<void>();
  int calls = 0;
  @override
  Future<void> setUserProfile({required UserProfile userProfile}) async {
    calls++;
    await gate.future;
    await super.setUserProfile(userProfile: userProfile);
  }
}
