import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/pages/onboarding/onboarding_step.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/phone_preview.dart';
import 'fixtures.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Route states',
  type: OnboardingScreen,
  path: '[P1 product surfaces]/Onboarding',
)
Widget onboardingScreenRouteStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingScreen',
    children: [
      WidgetbookPhoneStateCard(
        label: 'signed out welcome',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            uid: null,
            child: OnboardingScreen(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'profile completion flow',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            profile: widgetbookOnboardingProfileNoPhotos,
            child: OnboardingScreen(profileCompletionOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'run preferences flow',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            child: OnboardingScreen(runPreferencesOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'save profile pending',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.saveProfilePending,
            child: OnboardingScreen(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'save profile error',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.saveProfileError,
            child: OnboardingScreen(),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'complete pending',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.completePending,
            child: OnboardingScreen(runPreferencesOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'complete error',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.completeError,
            child: OnboardingScreen(runPreferencesOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'upload pending',
        child: WidgetbookMaterialPhoneFrame(
          child: WidgetbookOnboardingScope(
            mode: WidgetbookOnboardingMode.photos,
            profile: widgetbookOnboardingProfileOnePhoto,
            uploadState: widgetbookOnboardingSecondPhotoUploadingState,
            child: OnboardingScreen(profileCompletionOnly: true),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'text scale 2',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookPhoneMediaOverride(
            textScale: 2,
            child: WidgetbookOnboardingScope(child: OnboardingScreen()),
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'reduced motion',
        child: const WidgetbookMaterialPhoneFrame(
          child: WidgetbookPhoneMediaOverride(
            disableAnimations: true,
            child: WidgetbookOnboardingScope(
              mode: WidgetbookOnboardingMode.genderInterest,
              child: OnboardingScreen(),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step dispatch',
  type: OnboardingStepBody,
  path: '[P1 product surfaces]/Onboarding',
)
Widget onboardingStepBodyStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'OnboardingStepBody',
    children: [
      for (final step in [OnboardingStep.nameDob, OnboardingStep.instagram])
        WidgetbookPhoneStateCard(
          label: step.name,
          child: WidgetbookMaterialPhoneFrame(
            child: WidgetbookOnboardingScope(
              child: OnboardingStepBody(
                step: step,
                profileCompletionOnly: false,
                runPreferencesOnly: false,
              ),
            ),
          ),
        ),
    ],
  );
}
