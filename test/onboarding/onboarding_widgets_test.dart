import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid_keys.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_form_keys.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_gender_interest_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_gender_interest_step_state.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_instagram_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_instagram_step_state.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_name_dob_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_name_dob_step_state.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_photos_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_photos_step_state.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_profile_prompts_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_profile_prompts_step_state.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_running_prefs_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_running_prefs_step_state.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart' as app_router;
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../events/events_test_helpers.dart';
import 'onboarding_test_helpers.dart';

part 'onboarding_profile_prompts_tests.dart';
part 'onboarding_welcome_page_tests.dart';

final _l10n = AppLocalizationsEn();

void main() {
  _registerWelcomePageTests();

  group('OnboardingScreen', () {
    testWidgets(
      'back button returns editable onboarding steps to previous step',
      (tester) async {
        final container = createOnboardingTestContainer();
        addTearDown(container.dispose);

        await pumpOnboardingScreen(
          tester,
          container: container,
          child: const OnboardingScreen(),
        );

        container
            .read(onboardingControllerProvider.notifier)
            .goToStep(OnboardingStep.genderInterest);
        await pumpOnboardingUi(tester);

        expect(find.text('How do you identify?'), findsOneWidget);
        expect(find.text('STEP 1 OF 1'), findsOneWidget);
        await tester.tap(find.byTooltip('Back'));
        await pumpOnboardingUi(tester);

        expect(
          container.read(onboardingControllerProvider).step,
          OnboardingStep.nameDob,
        );
        expect(find.text("What's your name?"), findsOneWidget);
        expect(find.text('STEP 1 OF 1'), findsOneWidget);
      },
    );
  });

  group('OnboardingNameDobBody', () {
    test('state derives draft display, date policy, and submit intent', () {
      final state = OnboardingNameDobState.fromDraft(
        l10n: _l10n,
        firstName: ' Asha ',
        lastName: ' Runner ',
        phoneNumber: ' 9876543210 ',
        countryCode: '+91',
        dateOfBirth: DateTime(1997, 4, 15),
        step: OnboardingStep.nameDob,
        today: DateTime(2026, 7, 3),
      );

      expect(state.shouldAutofocus, isTrue);
      expect(state.dateText, '15 Apr 1997');
      expect(state.ageSuffix, 'AGE 29');
      expect(state.phonePrefix, '+91 ');
      expect(state.datePickerRequest.initialDate, DateTime(1997, 4, 15));
      expect(state.datePickerRequest.firstDate, DateTime(1920));
      expect(state.datePickerRequest.title, 'Date of birth');

      final intent = state.submitIntent(
        firstName: state.firstName,
        lastName: state.lastName,
        phoneNumber: state.phoneNumber,
      );
      expect(intent?.firstName, 'Asha');
      expect(intent?.lastName, 'Runner');
      expect(intent?.phoneNumber, '9876543210');
      expect(intent?.countryCode, '+91');
      expect(intent?.dateOfBirth, DateTime(1997, 4, 15));

      final missingDate = OnboardingNameDobState.fromDraft(
        l10n: _l10n,
        firstName: 'Asha',
        lastName: 'Runner',
        phoneNumber: '9876543210',
        countryCode: '+91',
        dateOfBirth: null,
        step: OnboardingStep.genderInterest,
        today: DateTime(2026, 7, 3),
      );
      expect(missingDate.shouldAutofocus, isFalse);
      expect(missingDate.dateText, isEmpty);
      expect(missingDate.ageSuffix, isNull);
      expect(missingDate.validateDateOfBirth(), isNull);
      expect(
        missingDate.submitIntent(
          firstName: 'Asha',
          lastName: 'Runner',
          phoneNumber: '9876543210',
        ),
        isNotNull,
      );
    });

    testWidgets('provider-free step forwards date and continue actions', (
      tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final controllers = OnboardingNameDobTextControllers(
        firstName: TextEditingController(text: 'Asha'),
        lastName: TextEditingController(text: 'Runner'),
        phone: TextEditingController(text: '9876543210'),
        date: TextEditingController(text: '15 Apr 1997'),
      );
      addTearDown(controllers.firstName.dispose);
      addTearDown(controllers.lastName.dispose);
      addTearDown(controllers.phone.dispose);
      addTearDown(controllers.date.dispose);
      final state = OnboardingNameDobState.fromDraft(
        l10n: _l10n,
        firstName: controllers.firstName.text,
        lastName: controllers.lastName.text,
        phoneNumber: controllers.phone.text,
        countryCode: '+91',
        dateOfBirth: DateTime(1997, 4, 15),
        step: OnboardingStep.nameDob,
        today: DateTime(2026, 7, 3),
      );
      OnboardingNameDobDatePickerRequest? dateRequest;
      var continueCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingNameDobStep(
              formKey: formKey,
              state: state,
              controllers: controllers,
              callbacks: OnboardingNameDobCallbacks(
                onPickDate: (request) => dateRequest = request,
                onContinue: () => continueCount += 1,
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      await tester.tap(find.byKey(OnboardingFormKeys.dateOfBirth));
      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);

      expect(dateRequest?.title, 'Date of birth');
      expect(dateRequest?.initialDate, DateTime(1997, 4, 15));
      expect(continueCount, 1);
      expect(find.text('AGE 29'), findsOneWidget);
    });

    testWidgets('validates required fields before continuing', (tester) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingNameDobBody(),
      );

      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);

      expect(find.text('First name is required'), findsOneWidget);
      expect(find.text('Last name is required'), findsNothing);
      expect(find.text('Please select your date of birth'), findsNothing);
    });

    testWidgets('social birthday advances to matching preferences', (
      tester,
    ) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);
      container.read(onboardingControllerProvider.notifier)
        ..goToStep(OnboardingStep.nameDob)
        ..setNameDob(
          firstName: 'Asha',
          lastName: 'Runner',
          dateOfBirth: DateTime(1997, 4, 15),
          phoneNumber: '9876543210',
          countryCode: '+91',
        );

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingNameDobBody(profileCompletionOnly: true),
      );

      expect(find.text('Asha'), findsNothing);
      expect(find.text('Runner'), findsNothing);
      expect(find.text('15 Apr 1997'), findsOneWidget);
      expect(find.text('9876543210'), findsNothing);

      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);

      expect(
        container.read(onboardingControllerProvider).step,
        OnboardingStep.genderInterest,
      );
    });

    testWidgets('keeps phone field read-only', (tester) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);
      container.read(onboardingControllerProvider.notifier)
        ..goToStep(OnboardingStep.nameDob)
        ..setNameDob(
          firstName: 'Asha',
          lastName: 'Runner',
          dateOfBirth: DateTime(1997, 4, 15),
          phoneNumber: '9876543210',
          countryCode: '+91',
        );

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingNameDobBody(),
      );

      expect(
        tester
            .widget<EditableText>(
              find.descendant(
                of: find.widgetWithText(CatchField, 'PHONE'),
                matching: find.byType(EditableText),
              ),
            )
            .readOnly,
        isTrue,
      );
    });
  });

  group('OnboardingGenderInterestBody', () {
    test('state validates selections and creates submit intent', () {
      final empty = OnboardingGenderInterestState.fromDraft(
        gender: null,
        interestedIn: const [],
        l10n: _l10n,
      );

      expect(empty.selectedGender, isEmpty);
      expect(empty.validateGender(null), 'Please select your gender');
      expect(
        empty.validateInterestedIn(null),
        'Please select who you want to see',
      );
      expect(empty.submitIntent(), isNull);

      final ready = OnboardingGenderInterestState.fromDraft(
        gender: Gender.woman,
        interestedIn: const [Gender.man],
        l10n: _l10n,
        isSaving: true,
        saveErrorMessage: 'Could not save profile.',
      );
      expect(ready.selectedGender, {Gender.woman});
      expect(ready.interestedIn, {Gender.man});
      expect(ready.isSaving, isTrue);
      expect(ready.hasSaveError, isTrue);
      expect(ready.validateGender(null), isNull);
      expect(ready.validateInterestedIn(null), isNull);
      expect(ready.submitIntent()?.gender, Gender.woman);
      expect(ready.submitIntent()?.interestedInGenders, [Gender.man]);
    });

    testWidgets('provider-free step forwards typed choice actions', (
      tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final state = OnboardingGenderInterestState.fromDraft(
        gender: Gender.woman,
        interestedIn: const [Gender.woman, Gender.man],
        l10n: _l10n,
        saveErrorMessage: 'Could not save profile.',
      );
      Set<Gender>? nextGender;
      Set<Gender>? nextInterestedIn;
      var continueCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingGenderInterestStep(
              formKey: formKey,
              state: state,
              callbacks: OnboardingGenderInterestCallbacks(
                onGenderChanged: (next) => nextGender = next,
                onInterestedInChanged: (next) => nextInterestedIn = next,
                onContinue: () => continueCount += 1,
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      expect(find.text('Could not save profile.'), findsOneWidget);
      expect(
        tester
            .widget<CatchField>(find.byKey(OnboardingFormKeys.interestedIn))
            .body,
        'Man, Woman',
      );

      await tester.tap(
        _catchFieldChoiceIn(OnboardingFormKeys.gender, Gender.man.label),
      );
      await tester.tap(
        _catchFieldChoiceIn(
          OnboardingFormKeys.interestedIn,
          Gender.nonBinary.label,
        ),
      );
      await tester.tap(
        find.byWidgetPredicate(
          (widget) => widget is CatchButton && widget.label == 'Continue',
        ),
      );
      await pumpOnboardingUi(tester);

      expect(nextGender, {Gender.man});
      expect(nextInterestedIn, {Gender.woman, Gender.man, Gender.nonBinary});
      expect(continueCount, 1);
    });

    testWidgets('pending save freezes both choices and continue', (
      tester,
    ) async {
      final state = OnboardingGenderInterestState.fromDraft(
        gender: Gender.woman,
        interestedIn: const [Gender.man],
        l10n: _l10n,
        isSaving: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingGenderInterestStep(
              formKey: GlobalKey<FormState>(),
              state: state,
              callbacks: OnboardingGenderInterestCallbacks(
                onGenderChanged: (_) {},
                onInterestedInChanged: (_) {},
                onContinue: () {},
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      expect(
        tester
            .widget<CatchField>(find.byKey(OnboardingFormKeys.gender))
            .enabled,
        isFalse,
      );
      expect(
        tester
            .widget<CatchField>(find.byKey(OnboardingFormKeys.interestedIn))
            .enabled,
        isFalse,
      );
      expect(
        tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
        isNull,
      );
    });

    testWidgets('validates required selections before continuing', (
      tester,
    ) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingGenderInterestBody(),
      );

      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);

      expect(find.text('Please select your gender'), findsOneWidget);
      expect(find.text('Please select who you want to see'), findsOneWidget);
    });

    testWidgets('restores saved selections from the onboarding draft', (
      tester,
    ) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);
      container
          .read(onboardingControllerProvider.notifier)
          .setGenderInterest(
            gender: Gender.woman,
            interestedInGenders: const [Gender.man],
          );

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingGenderInterestBody(),
      );

      expect(
        tester
            .widget<CatchChip>(
              _catchFieldChoiceIn(
                OnboardingFormKeys.gender,
                Gender.woman.label,
              ),
            )
            .selected,
        isTrue,
      );
      expect(
        tester
            .widget<CatchChip>(
              _catchFieldChoiceIn(
                OnboardingFormKeys.interestedIn,
                Gender.man.label,
              ),
            )
            .selected,
        isTrue,
      );
    });
  });

  group('OnboardingInstagramBody', () {
    test('state trims continue handles and clears skipped handles', () {
      final state = OnboardingInstagramState.fromDraft(
        handle: ' sundayseaface ',
      );

      expect(state.handleText, ' sundayseaface ');
      expect(
        state.continueIntent(handle: state.handleText).instagramHandle,
        'sundayseaface',
      );
      expect(state.continueIntent(handle: '   ').instagramHandle, isNull);
      expect(state.skipIntent.instagramHandle, isNull);
    });

    testWidgets('provider-free step forwards continue and skip actions', (
      tester,
    ) async {
      final controllers = OnboardingInstagramTextControllers(
        handle: TextEditingController(text: 'sundayseaface'),
      );
      addTearDown(controllers.handle.dispose);
      var continueCount = 0;
      var skipCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingInstagramStep(
              controllers: controllers,
              callbacks: OnboardingInstagramCallbacks(
                onContinue: () => continueCount += 1,
                onSkip: () => skipCount += 1,
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await tester.tap(find.widgetWithText(CatchButton, 'Skip for now'));
      await pumpOnboardingUi(tester);

      expect(continueCount, 1);
      expect(skipCount, 1);
    });

    testWidgets('continues with a trimmed handle and advances to photos', (
      tester,
    ) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);
      container
          .read(onboardingControllerProvider.notifier)
          .goToStep(OnboardingStep.instagram);
      container
          .read(onboardingControllerProvider.notifier)
          .setInstagramHandle(' sundayseaface ');

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingInstagramBody(),
      );

      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await pumpOnboardingUi(tester);

      final data = container.read(onboardingControllerProvider);
      expect(data.step, OnboardingStep.photos);
      expect(data.instagramHandle, 'sundayseaface');
    });

    testWidgets('skip clears the handle and advances to photos', (
      tester,
    ) async {
      final container = createOnboardingTestContainer();
      addTearDown(container.dispose);
      container
          .read(onboardingControllerProvider.notifier)
          .goToStep(OnboardingStep.instagram);
      container
          .read(onboardingControllerProvider.notifier)
          .setInstagramHandle('sundayseaface');

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingInstagramBody(),
      );

      await tester.tap(find.widgetWithText(CatchButton, 'Skip for now'));
      await pumpOnboardingUi(tester);

      final data = container.read(onboardingControllerProvider);
      expect(data.step, OnboardingStep.photos);
      expect(data.instagramHandle, isNull);
    });
  });

  group('OnboardingPhotosBody', () {
    test('state derives continue gating and photo slot intents', () {
      final onePhoto = buildUser(
        photoUrls: const ['assets/test/onboarding-photo-1.jpg'],
      ).effectiveProfilePhotos;
      final readyPhotos = buildUser(
        photoUrls: const [
          'assets/test/onboarding-photo-1.jpg',
          'assets/test/onboarding-photo-2.jpg',
        ],
      ).effectiveProfilePhotos;
      final editablePhotos = buildUser(
        photoUrls: const [
          'assets/test/onboarding-photo-1.jpg',
          'assets/test/onboarding-photo-2.jpg',
          'assets/test/onboarding-photo-3.jpg',
        ],
      ).effectiveProfilePhotos;

      final empty = OnboardingPhotosState.from(
        profilePhotos: const [],
        loadingIndices: const {},
        profileCompletionOnly: false,
      );
      expect(empty.canContinue, isFalse);
      expect(empty.continueHint(_l10n), 'Add 2 more photos to continue.');
      expect(
        empty.supportingCopy(_l10n),
        'Running photos boost catches by 2.3x.',
      );

      final pending = OnboardingPhotosState.from(
        profilePhotos: onePhoto,
        loadingIndices: const {1},
        profileCompletionOnly: true,
      );
      expect(pending.canContinue, isFalse);
      expect(
        pending.continueHint(_l10n),
        'Finish uploading your photos to continue.',
      );
      expect(
        pending.supportingCopy(_l10n),
        'This only gates Catches. Event booking stays available.',
      );

      final ready = OnboardingPhotosState.from(
        profilePhotos: readyPhotos,
        loadingIndices: const {},
        profileCompletionOnly: false,
      );
      expect(ready.canContinue, isTrue);
      expect(ready.continueHint(_l10n), isNull);
      expect(ready.slotIntent(0).photo, readyPhotos.first);
      expect(ready.slotIntent(0).canDelete, isFalse);

      final editable = OnboardingPhotosState.from(
        profilePhotos: editablePhotos,
        loadingIndices: const {},
        profileCompletionOnly: false,
      );
      expect(editable.slotIntent(0).canDelete, isTrue);
      expect(editable.slotIntent(3).photo, isNull);
    });

    testWidgets('provider-free step forwards typed photo actions', (
      tester,
    ) async {
      final state = OnboardingPhotosState.from(
        profilePhotos: const [],
        loadingIndices: const {},
        profileCompletionOnly: false,
      );
      var continueCount = 0;
      OnboardingPhotoSlotIntent? slotIntent;
      int? deletedIndex;
      (int, int)? reorderIntent;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingPhotosStep(
              state: state,
              callbacks: OnboardingPhotosCallbacks(
                onContinue: () => continueCount += 1,
                onSlotTapped: (intent) => slotIntent = intent,
                onDeletePhoto: (index) => deletedIndex = index,
                onReorderPhoto: (fromIndex, toIndex) {
                  reorderIntent = (fromIndex, toIndex);
                },
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
      await tester.tap(find.byKey(PhotoGridKeys.slot(0)));
      await pumpOnboardingUi(tester);

      expect(continueCount, 1);
      expect(slotIntent?.index, 0);
      expect(slotIntent?.photo, isNull);
      expect(slotIntent?.canDelete, isFalse);
      expect(deletedIndex, isNull);
      expect(reorderIntent, isNull);
    });

    testWidgets(
      'explains why continue is disabled until enough photos are added',
      (tester) async {
        tester.view.devicePixelRatio = 1.0;
        tester.view.physicalSize = const Size(1080, 2200);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final container = createOnboardingTestContainer(
          overrides: [
            watchUserProfileProvider.overrideWith(
              (ref) =>
                  Stream.value(buildUser().copyWith(profilePhotos: const [])),
            ),
          ],
        );
        addTearDown(container.dispose);

        await pumpOnboardingPage(
          tester,
          container: container,
          child: const OnboardingPhotosBody(),
        );

        expect(find.text('Add 2 more photos to continue.'), findsOneWidget);
        expect(
          tester
              .widget<CatchButton>(find.widgetWithText(CatchButton, 'Continue'))
              .onPressed,
          isNull,
        );
      },
    );

    testWidgets('explains the catches gate in profile-completion mode', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1.0;
      tester.view.physicalSize = const Size(1080, 2200);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final container = createOnboardingTestContainer(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) =>
                Stream.value(buildUser().copyWith(profilePhotos: const [])),
          ),
        ],
      );
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingPhotosBody(profileCompletionOnly: true),
      );

      expect(
        find.text('This only gates Catches. Event booking stays available.'),
        findsOneWidget,
      );
    });

    testWidgets('surfaces upload failures from the photo upload controller', (
      tester,
    ) async {
      final user = buildUser().copyWith(profilePhotos: const []);
      final container = createOnboardingTestContainer(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
          userProfileRepositoryProvider.overrideWithValue(
            FakeOnboardingUserProfileRepository(currentUser: user),
          ),
          imageUploadRepositoryProvider.overrideWithValue(
            _FailingOnboardingImageUploadRepository(),
          ),
          errorLoggerProvider.overrideWithValue(_SilentOnboardingErrorLogger()),
        ],
      );
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const _OnboardingUploadFailureSeeder(),
      );
      await pumpOnboardingUi(tester);
      await pumpOnboardingUi(tester);

      expect(find.text('Upload failed. Please try again.'), findsOneWidget);
      expect(
        container
            .read(photoUploadControllerProvider)
            .loadingIndices
            .contains(0),
        isFalse,
      );
    });
  });

  _registerProfilePromptsPageTests();

  group('OnboardingRunningPrefsBody', () {
    test('state derives labels and submit payload', () {
      final state = OnboardingRunningPrefsState.fromDraft(
        paceRange: const RangeValues(300, 420),
        distances: const [PreferredDistance.fiveK],
        reasons: const [RunReason.community],
        runTimes: const [PreferredRunTime.morning],
        l10n: _l10n,
        runPreferencesOnly: true,
        isCompleting: true,
        completeErrorMessage: 'Could not save run preferences.',
      );

      expect(state.footerLabel, 'Continue booking');
      expect(state.reasonLabel, 'Why do you run?');
      expect(state.runTimesLabel, 'FAVOURITE RUN TIMES');
      expect(state.minPaceLabel, '5:00/km');
      expect(state.maxPaceLabel, '7:00/km');
      expect(state.canSubmit, isFalse);
      expect(state.hasCompleteError, isTrue);

      final intent = state.submitIntent();
      expect(intent.paceMinSecsPerKm, 300);
      expect(intent.paceMaxSecsPerKm, 420);
      expect(intent.preferredDistances, [PreferredDistance.fiveK]);
      expect(intent.runningReasons, [RunReason.community]);
      expect(intent.preferredRunTimes, [PreferredRunTime.morning]);
    });

    testWidgets('provider-free step shows state and forwards continue', (
      tester,
    ) async {
      final state = OnboardingRunningPrefsState.fromDraft(
        paceRange: const RangeValues(300, 420),
        distances: const [PreferredDistance.fiveK],
        reasons: const [RunReason.community],
        runTimes: const [PreferredRunTime.morning],
        l10n: _l10n,
        completeErrorMessage: 'Could not save run preferences.',
      );
      var continueCount = 0;
      RangeValues? nextPace;
      Set<PreferredDistance>? nextDistances;
      Set<RunReason>? nextReasons;
      Set<PreferredRunTime>? nextRunTimes;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingRunningPrefsStep(
              state: state,
              callbacks: OnboardingRunningPrefsCallbacks(
                onPaceChanged: (next) => nextPace = next,
                onDistancesChanged: (next) => nextDistances = next,
                onReasonsChanged: (next) => nextReasons = next,
                onRunTimesChanged: (next) => nextRunTimes = next,
                onContinue: () => continueCount += 1,
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      expect(find.text('Save run preferences'), findsOneWidget);
      expect(find.text('5:00/km'), findsOneWidget);
      expect(find.text('7:00/km'), findsOneWidget);
      expect(find.text('Could not save run preferences.'), findsOneWidget);

      final slider = find.descendant(
        of: find.byKey(OnboardingFormKeys.runningPace),
        matching: find.byType(RangeSlider),
      );
      await tester.ensureVisible(slider);
      await pumpOnboardingUi(tester);
      tester.widget<RangeSlider>(slider).onChanged!(
        const RangeValues(330, 450),
      );
      await pumpOnboardingUi(tester);

      final distancesField = find.byKey(OnboardingFormKeys.runningDistances);
      await tester.ensureVisible(distancesField);
      await pumpOnboardingUi(tester);
      final distancesWidget = tester.widget<CatchField>(distancesField);
      expect(distancesWidget.open, isNull);
      expect(distancesWidget.initiallyOpen, isTrue);
      final tenK = _catchFieldChoiceIn(
        OnboardingFormKeys.runningDistances,
        PreferredDistance.tenK.label,
      );
      tester.widget<CatchChip>(tenK).onPressed!();
      await pumpOnboardingUi(tester);

      final reasonsField = find.byKey(OnboardingFormKeys.runningReasons);
      await tester.ensureVisible(reasonsField);
      await pumpOnboardingUi(tester);
      final reasonsWidget = tester.widget<CatchField>(reasonsField);
      expect(reasonsWidget.open, isNull);
      expect(reasonsWidget.initiallyOpen, isTrue);
      final mindfulness = _catchFieldChoiceIn(
        OnboardingFormKeys.runningReasons,
        RunReason.mindfulness.label,
      );
      tester.widget<CatchChip>(mindfulness).onPressed!();
      await pumpOnboardingUi(tester);

      final timesField = find.byKey(OnboardingFormKeys.runningTimes);
      await tester.ensureVisible(timesField);
      await pumpOnboardingUi(tester);
      final timesWidget = tester.widget<CatchField>(timesField);
      expect(timesWidget.open, isNull);
      expect(timesWidget.initiallyOpen, isTrue);
      final evening = _catchFieldChoiceIn(
        OnboardingFormKeys.runningTimes,
        PreferredRunTime.evening.label,
      );
      tester.widget<CatchChip>(evening).onPressed!();
      await pumpOnboardingUi(tester);

      await tester.tap(
        find.widgetWithText(CatchButton, 'Save run preferences'),
      );
      await pumpOnboardingUi(tester);

      expect(continueCount, 1);
      expect(nextPace, isNotNull);
      expect(nextDistances, {PreferredDistance.fiveK, PreferredDistance.tenK});
      expect(nextReasons, {RunReason.community, RunReason.mindfulness});
      expect(nextRunTimes, {
        PreferredRunTime.morning,
        PreferredRunTime.evening,
      });
    });

    testWidgets('pending completion freezes every run-preference control', (
      tester,
    ) async {
      final state = OnboardingRunningPrefsState.fromDraft(
        paceRange: const RangeValues(300, 420),
        distances: const [PreferredDistance.fiveK],
        reasons: const [RunReason.community],
        runTimes: const [PreferredRunTime.morning],
        l10n: _l10n,
        isCompleting: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: OnboardingRunningPrefsStep(
              state: state,
              callbacks: OnboardingRunningPrefsCallbacks(
                onPaceChanged: (_) {},
                onDistancesChanged: (_) {},
                onReasonsChanged: (_) {},
                onRunTimesChanged: (_) {},
                onContinue: () {},
              ),
            ),
          ),
        ),
      );
      await pumpOnboardingUi(tester);

      expect(
        tester.widget<RangeSlider>(find.byType(RangeSlider)).onChanged,
        isNull,
      );
      for (final key in [
        OnboardingFormKeys.runningDistances,
        OnboardingFormKeys.runningReasons,
        OnboardingFormKeys.runningTimes,
      ]) {
        expect(tester.widget<CatchField>(find.byKey(key)).enabled, isFalse);
      }
      expect(
        tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
        isNull,
      );
    });

    testWidgets('explains run preferences as event-specific booking data', (
      tester,
    ) async {
      final container = createOnboardingTestContainer(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser()),
          ),
        ],
      );
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingRunningPrefsBody(runPreferencesOnly: true),
      );

      expect(find.text('Why do you run?'), findsOneWidget);
      expect(find.text('Continue booking'), findsOneWidget);
    });

    testWidgets('shows favorite event-time preferences', (tester) async {
      final container = createOnboardingTestContainer(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(
              buildUser().copyWith(
                activityPreferences: const ActivityPreferences(
                  running: RunningPreferences(
                    preferredRunTimes: [PreferredRunTime.morning],
                    version: currentRunPreferencesVersion,
                  ),
                ),
              ),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const OnboardingRunningPrefsBody(),
      );

      expect(find.text('FAVOURITE EVENT TIMES'), findsOneWidget);
      expect(find.text('Morning'), findsOneWidget);
      expect(find.text('Evening'), findsOneWidget);
    });
  });
}

Finder _catchFieldChoiceIn(Key fieldKey, String label) {
  return find.descendant(
    of: find.byKey(fieldKey),
    matching: find.byWidgetPredicate(
      (widget) =>
          widget is CatchChip && widget.mode != null && widget.label == label,
    ),
  );
}

File _welcomeStringsSource() {
  final handoff = File(
    '${Platform.environment['HOME']}/Downloads/Catch Design System (2)/splash-welcome-handoff/strings.json',
  );
  if (handoff.existsSync()) return handoff;
  return File('test/fixtures/splash_welcome_strings.json');
}

ActivityKind _welcomeActivityKind(String activity) => switch (activity) {
  'social-run' => ActivityKind.socialRun,
  'dinner' => ActivityKind.dinner,
  'pub-quiz' => ActivityKind.pubQuiz,
  'padel' => ActivityKind.padel,
  'running' => ActivityKind.running,
  'strength' => ActivityKind.strengthTraining,
  'bar-crawl' => ActivityKind.barCrawl,
  'yoga' => ActivityKind.yoga,
  'cycling' => ActivityKind.cycling,
  'singles' => ActivityKind.singlesMixer,
  _ => throw StateError('Unknown welcome activity slug: $activity'),
};

Color _colorFromHex(String hex) {
  final value = hex.replaceFirst('#', '');
  return Color(int.parse('FF$value', radix: 16));
}

final class _AnalyticsEventCall {
  const _AnalyticsEventCall(this.name, this.parameters);

  final String name;
  final Map<String, Object>? parameters;
}

final class _FakeAnalyticsReporter implements AnalyticsReporter {
  final events = <_AnalyticsEventCall>[];

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {
    events.add(_AnalyticsEventCall(name, parameters));
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}

class _OnboardingUploadFailureSeeder extends ConsumerStatefulWidget {
  const _OnboardingUploadFailureSeeder();

  @override
  ConsumerState<_OnboardingUploadFailureSeeder> createState() =>
      _OnboardingUploadFailureSeederState();
}

class _OnboardingUploadFailureSeederState
    extends ConsumerState<_OnboardingUploadFailureSeeder> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      PhotoUploadController.uploadPhotoMutation.reset(ref);
      unawaited(
        PhotoUploadController.uploadPhotoMutation
            .run(ref, (tx) async {
              await tx
                  .get(photoUploadControllerProvider.notifier)
                  .pickAndUpload(0);
            })
            .catchError((_) {}),
      );
    });
  }

  @override
  Widget build(BuildContext context) => const OnboardingPhotosBody();
}

class _FailingOnboardingImageUploadRepository extends Fake
    implements ImageUploadRepository {
  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async {
    return XFile('picked-onboarding-photo.jpg');
  }

  @override
  Future<UploadedImage> uploadUserProfilePhoto({
    required String uid,
    required int index,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    throw obviousOfflineException();
  }
}

class _SilentOnboardingErrorLogger extends ErrorLogger {
  _SilentOnboardingErrorLogger()
    : super(crashReporter: null, shouldReportErrors: false);

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}
