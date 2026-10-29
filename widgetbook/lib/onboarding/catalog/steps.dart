import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
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
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/phone_preview.dart';

// Provider-free step previews. The connected `Onboarding*Body` previews in
// the sibling catalogs drive these same steps through the onboarding scope.

@widgetbook.UseCase(
  name: 'Step states',
  type: OnboardingNameDobStep,
  path: '[P1 product surfaces]/Onboarding/Steps',
)
Widget onboardingNameDobStepStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingNameDobStep',
    children: [
      WidgetbookPhoneStateCard(
        label: 'filled',
        child: WidgetbookMaterialPhoneFrame(
          child: OnboardingNameDobStep(
            formKey: GlobalKey<FormState>(),
            state: OnboardingNameDobState(
              firstName: 'Asha',
              lastName: 'Rao',
              phoneNumber: '9876543210',
              countryCode: '+91',
              dateOfBirth: DateTime(1996, 4, 12),
              step: OnboardingStep.nameDob,
              today: DateTime(2026, 10, 18),
              datePickerTitle: 'Date of birth',
              firstNameValidationLabel: 'First name',
              lastNameValidationLabel: 'Last name',
            ),
            controllers: OnboardingNameDobTextControllers(
              firstName: TextEditingController(text: 'Asha'),
              lastName: TextEditingController(text: 'Rao'),
              phone: TextEditingController(text: '98765 43210'),
              date: TextEditingController(text: '12/04/1996'),
            ),
            callbacks: OnboardingNameDobCallbacks(
              onPickDate: (_) {},
              onContinue: () {},
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step states',
  type: OnboardingGenderInterestStep,
  path: '[P1 product surfaces]/Onboarding/Steps',
)
Widget onboardingGenderInterestStepStates(BuildContext context) {
  final callbacks = OnboardingGenderInterestCallbacks(
    onGenderChanged: (_) {},
    onInterestedInChanged: (_) {},
    onContinue: () {},
  );
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingGenderInterestStep',
    children: [
      for (final (label, state) in [
        (
          'empty',
          const OnboardingGenderInterestState(
            gender: null,
            interestedIn: {},
            isSaving: false,
            saveErrorMessage: null,
            genderValidationMessage: 'Choose your gender',
            interestValidationMessage: 'Choose who you want to meet',
          ),
        ),
        (
          'chosen',
          const OnboardingGenderInterestState(
            gender: Gender.woman,
            interestedIn: {Gender.man},
            isSaving: false,
            saveErrorMessage: null,
            genderValidationMessage: 'Choose your gender',
            interestValidationMessage: 'Choose who you want to meet',
          ),
        ),
        (
          'save error',
          const OnboardingGenderInterestState(
            gender: Gender.woman,
            interestedIn: {Gender.man},
            isSaving: false,
            saveErrorMessage: 'We could not save that. Try again.',
            genderValidationMessage: 'Choose your gender',
            interestValidationMessage: 'Choose who you want to meet',
          ),
        ),
      ])
        WidgetbookPhoneStateCard(
          label: label,
          child: WidgetbookMaterialPhoneFrame(
            child: OnboardingGenderInterestStep(
              formKey: GlobalKey<FormState>(),
              state: state,
              callbacks: callbacks,
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step states',
  type: OnboardingInstagramStep,
  path: '[P1 product surfaces]/Onboarding/Steps',
)
Widget onboardingInstagramStepStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingInstagramStep',
    children: [
      for (final (label, handle) in [('empty', ''), ('handle', 'asha.runs')])
        WidgetbookPhoneStateCard(
          label: label,
          child: WidgetbookMaterialPhoneFrame(
            child: OnboardingInstagramStep(
              controllers: OnboardingInstagramTextControllers(
                handle: TextEditingController(text: handle),
              ),
              callbacks: OnboardingInstagramCallbacks(
                onContinue: () {},
                onSkip: () {},
              ),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step states',
  type: OnboardingPhotosStep,
  path: '[P1 product surfaces]/Onboarding/Steps',
)
Widget onboardingPhotosStepStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingPhotosStep',
    children: [
      for (final (label, loading) in [
        ('empty slots', <int>{}),
        ('first slot uploading', {0}),
      ])
        WidgetbookPhoneStateCard(
          label: label,
          child: WidgetbookMaterialPhoneFrame(
            child: OnboardingPhotosStep(
              state: OnboardingPhotosState.from(
                profilePhotos: const [],
                loadingIndices: loading,
                profileCompletionOnly: false,
              ),
              callbacks: OnboardingPhotosCallbacks(
                onContinue: null,
                onSlotTapped: (_) {},
                onDeletePhoto: (_) {},
                onReorderPhoto: (_, _) {},
              ),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step states',
  type: OnboardingProfilePromptsStep,
  path: '[P1 product surfaces]/Onboarding/Steps',
)
Widget onboardingProfilePromptsStepStates(BuildContext context) {
  final promptIds = profilePromptCatalog
      .take(3)
      .map((definition) => definition.id)
      .toList(growable: false);
  const answers = ['Sunday long runs by the lake', '', ''];
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingProfilePromptsStep',
    children: [
      WidgetbookPhoneStateCard(
        label: 'one answered',
        child: WidgetbookMaterialPhoneFrame(
          child: OnboardingProfilePromptsStep(
            state: OnboardingProfilePromptsState(
              selectedPromptIds: promptIds,
              answerTexts: answers,
              isCompleting: false,
              completeErrorMessage: null,
            ),
            controllers: OnboardingProfilePromptsTextControllers(
              answers: [
                for (final answer in answers)
                  TextEditingController(text: answer),
              ],
            ),
            callbacks: OnboardingProfilePromptsCallbacks(
              onPromptChanged: (_, _) {},
              onContinue: () {},
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step states',
  type: OnboardingRunningPrefsStep,
  path: '[P1 product surfaces]/Onboarding/Steps',
)
Widget onboardingRunningPrefsStepStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingRunningPrefsStep',
    children: [
      WidgetbookPhoneStateCard(
        label: 'preferences chosen',
        child: WidgetbookMaterialPhoneFrame(
          child: OnboardingRunningPrefsStep(
            state: const OnboardingRunningPrefsState(
              paceRange: RangeValues(300, 420),
              distances: {PreferredDistance.fiveK},
              reasons: {RunReason.fitness},
              runTimes: {PreferredRunTime.morning},
              runPreferencesOnly: false,
              isCompleting: false,
              completeErrorMessage: null,
              footerLabel: 'Continue',
              reasonLabel: 'Why you run',
              runTimesLabel: 'When you run',
            ),
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
    ],
  );
}
