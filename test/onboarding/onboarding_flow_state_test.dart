import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_flow_state.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final l10n = AppLocalizationsEn();

  group('OnboardingFlowState', () {
    test('keeps welcome as a body-only shell with no top bar', () {
      final state = OnboardingFlowState.from(
        l10n: l10n,
        data: const OnboardingData(),
        profileCompletionOnly: false,
        runPreferencesOnly: false,
      );

      expect(state.entryMode, OnboardingEntryMode.standard);
      expect(state.step, OnboardingStep.welcome);
      expect(state.previousStep, isNull);
      expect(state.showsWelcome, true);
      expect(state.showsProgressShell, false);
      expect(state.topBar, isNull);
    });

    test('standard account setup has one identity step', () {
      final state = OnboardingFlowState.from(
        l10n: l10n,
        data: const OnboardingData(step: OnboardingStep.nameDob),
        profileCompletionOnly: false,
        runPreferencesOnly: false,
      );

      expect(state.entryMode, OnboardingEntryMode.standard);
      expect(state.previousStep, isNull);
      expect(state.showsProgressShell, true);
      expect(state.topBar?.title, "What's your name?");
      expect(state.topBar?.stepNumber, 1);
      expect(state.topBar?.stepTotal, 1);
      expect(state.topBar?.canGoBack, false);
    });

    test('locks profile-completion back target to the photos step', () {
      final state = OnboardingFlowState.from(
        l10n: l10n,
        data: const OnboardingData(step: OnboardingStep.prompts),
        profileCompletionOnly: true,
        runPreferencesOnly: false,
      );

      expect(state.entryMode, OnboardingEntryMode.profileCompletion);
      expect(state.previousStep, OnboardingStep.photos);
      expect(state.topBar?.title, 'Add prompts to start catching');
      expect(state.topBar?.stepNumber, 4);
      expect(state.topBar?.stepTotal, 4);
    });

    test('freezes backward navigation while a step mutation is pending', () {
      final state = OnboardingFlowState.from(
        l10n: l10n,
        data: const OnboardingData(
          step: OnboardingStep.prompts,
          operationPending: true,
        ),
        profileCompletionOnly: true,
        runPreferencesOnly: false,
      );

      expect(state.previousStep, OnboardingStep.photos);
      expect(state.operationPending, isTrue);
      expect(state.topBar?.canGoBack, isFalse);
    });

    test('locks run-preferences entry to a single-step flow', () {
      final state = OnboardingFlowState.from(
        l10n: l10n,
        data: const OnboardingData(step: OnboardingStep.runningPrefs),
        profileCompletionOnly: false,
        runPreferencesOnly: true,
      );

      expect(state.entryMode, OnboardingEntryMode.runPreferences);
      expect(state.previousStep, isNull);
      expect(state.topBar?.title, 'Set your run preferences');
      expect(state.topBar?.stepNumber, 1);
      expect(state.topBar?.stepTotal, 1);
      expect(state.topBar?.canGoBack, false);
    });
  });
}
