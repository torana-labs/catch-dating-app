import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_l10n/l10n.dart';

enum OnboardingEntryMode {
  standard,
  profileCompletion,
  eventBooking,
  runPreferences;

  static OnboardingEntryMode fromFlags({
    required bool profileCompletionOnly,
    required bool runPreferencesOnly,
    List<String>? eventRequirements,
  }) {
    if (eventRequirements != null) return OnboardingEntryMode.eventBooking;
    if (runPreferencesOnly) return OnboardingEntryMode.runPreferences;
    if (profileCompletionOnly) return OnboardingEntryMode.profileCompletion;
    return OnboardingEntryMode.standard;
  }
}

class OnboardingFlowState {
  const OnboardingFlowState({
    required this.entryMode,
    required this.step,
    required this.previousStep,
    required this.topBar,
    required this.operationPending,
  });

  final OnboardingEntryMode entryMode;
  final OnboardingStep step;
  final OnboardingStep? previousStep;
  final OnboardingTopBarState? topBar;
  final bool operationPending;

  bool get showsWelcome => step == OnboardingStep.welcome;

  bool get showsProgressShell => !showsWelcome;

  factory OnboardingFlowState.from({
    required AppLocalizations l10n,
    required OnboardingData data,
    required bool profileCompletionOnly,
    required bool runPreferencesOnly,
    List<String>? eventRequirements,
  }) {
    final entryMode = OnboardingEntryMode.fromFlags(
      profileCompletionOnly: profileCompletionOnly,
      runPreferencesOnly: runPreferencesOnly,
      eventRequirements: eventRequirements,
    );
    final minimumStep = entryMode.minimumBackStepFor(data.step);
    final previousStep =
        eventRequirements != null &&
            !eventRequirements.contains('ageRestricted')
        ? null
        : data.step.previousWithin(minimumStep);

    return OnboardingFlowState(
      entryMode: entryMode,
      step: data.step,
      previousStep: previousStep,
      operationPending: data.operationPending,
      topBar: data.step.showsProgress
          ? OnboardingTopBarState.from(
              step: data.step,
              l10n: l10n,
              entryMode: entryMode,
              eventRequirements: eventRequirements,
              canGoBack: previousStep != null && !data.operationPending,
            )
          : null,
    );
  }
}

extension OnboardingEntryModeX on OnboardingEntryMode {
  bool get profileCompletionOnly =>
      this == OnboardingEntryMode.profileCompletion ||
      this == OnboardingEntryMode.eventBooking;

  bool get runPreferencesOnly => this == OnboardingEntryMode.runPreferences;

  OnboardingStep minimumBackStepFor(OnboardingStep step) {
    if (this == OnboardingEntryMode.runPreferences) {
      return OnboardingStep.runningPrefs;
    }
    if (this == OnboardingEntryMode.profileCompletion &&
        step.index >= OnboardingStep.photos.index) {
      return OnboardingStep.photos;
    }
    return step.minimumBackStep;
  }
}

class OnboardingTopBarState {
  const OnboardingTopBarState({
    required this.step,
    required this.title,
    required this.subtitle,
    required this.stepNumber,
    required this.stepTotal,
    required this.canGoBack,
  });

  final OnboardingStep step;
  final String title;
  final String? subtitle;
  final int stepNumber;
  final int stepTotal;
  final bool canGoBack;

  factory OnboardingTopBarState.from({
    required AppLocalizations l10n,
    required OnboardingStep step,
    required OnboardingEntryMode entryMode,
    required bool canGoBack,
    List<String>? eventRequirements,
  }) {
    final profileCompletionOnly = entryMode.profileCompletionOnly;
    final runPreferencesOnly = entryMode.runPreferencesOnly;
    final progressIndex = eventRequirements != null
        ? (eventRequirements.contains('ageRestricted') &&
                  step == OnboardingStep.genderInterest
              ? 1
              : 0)
        : profileCompletionOnly
        ? switch (step) {
            OnboardingStep.genderInterest => 1,
            OnboardingStep.photos => 2,
            OnboardingStep.prompts => 3,
            _ => 0,
          }
        : 0;
    final progressTotal = eventRequirements != null
        ? (eventRequirements.length > 1 ? 2 : 1)
        : runPreferencesOnly || !profileCompletionOnly
        ? 1
        : 4;
    final copy = step.headerCopy(
      l10n: l10n,
      profileCompletionOnly: profileCompletionOnly,
      runPreferencesOnly: runPreferencesOnly,
    );

    return OnboardingTopBarState(
      step: step,
      title: profileCompletionOnly && step == OnboardingStep.nameDob
          ? l10n.onboardingNameDobPageStateVisiblecopyDateOfBirth
          : copy.title,
      subtitle: profileCompletionOnly && step == OnboardingStep.nameDob
          ? null
          : copy.subtitle,
      stepNumber: progressTotal == 1 ? 1 : progressIndex + 1,
      stepTotal: progressTotal,
      canGoBack: canGoBack,
    );
  }
}
