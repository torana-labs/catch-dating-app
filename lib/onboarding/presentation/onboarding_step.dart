import 'package:catch_l10n/l10n.dart';

enum OnboardingStep {
  welcome,
  nameDob,
  genderInterest,
  instagram,
  photos,
  prompts,
  runningPrefs;

  static OnboardingStep? fromIndex(int index) {
    if (index < 0 || index >= OnboardingStep.values.length) return null;
    return OnboardingStep.values[index];
  }
}

extension OnboardingStepX on OnboardingStep {
  bool get showsProgress => this != OnboardingStep.welcome;

  /// The step's question + supporting line, surfaced in the flow header (the DS
  /// pattern: the header carries the question, the page carries only the form).
  /// Conditional copy mirrors the `profileCompletionOnly` / `runPreferencesOnly`
  /// entry modes the onboarding screen drives.
  ({String title, String? subtitle}) headerCopy({
    required AppLocalizations l10n,
    required bool profileCompletionOnly,
    required bool runPreferencesOnly,
  }) {
    return switch (this) {
      OnboardingStep.welcome => (
        title: l10n.onboardingOnboardingStepTitleWelcome,
        subtitle: null,
      ),
      OnboardingStep.nameDob => (
        title: l10n.onboardingOnboardingStepTitleWhatSYourName,
        subtitle: l10n.onboardingOnboardingStepSubtitleLastNameStaysPrivate,
      ),
      OnboardingStep.genderInterest => (
        title: l10n.onboardingOnboardingStepTitleHowDoYouIdentify,
        subtitle: null,
      ),
      OnboardingStep.instagram => (
        title: l10n.onboardingOnboardingStepTitleYourInstagram,
        subtitle: l10n.onboardingOnboardingStepSubtitleHelpsUsVerifyYou,
      ),
      OnboardingStep.photos =>
        profileCompletionOnly
            ? (
                title: l10n.onboardingOnboardingStepTitleCompleteYourProfileFor,
                subtitle:
                    l10n.onboardingOnboardingStepSubtitleCatchesNeedPhotosSo,
              )
            : (
                title: l10n.onboardingOnboardingStepTitleShowYourself,
                subtitle: l10n.onboardingOnboardingStepSubtitleAddAtLeast2,
              ),
      OnboardingStep.prompts =>
        profileCompletionOnly
            ? (
                title: l10n.onboardingOnboardingStepTitleAddPromptsToStart,
                subtitle: l10n
                    .onboardingOnboardingStepSubtitlePromptsGivePeopleSomething,
              )
            : (
                title: l10n.onboardingOnboardingStepTitleShowYourPersonality,
                subtitle: l10n.onboardingOnboardingStepSubtitleAnswer3PromptsTo,
              ),
      OnboardingStep.runningPrefs =>
        profileCompletionOnly
            ? (
                title:
                    l10n.onboardingOnboardingStepTitleFinishYourCatchesProfile,
                subtitle:
                    l10n.onboardingOnboardingStepSubtitleTheseAreOptionalBut,
              )
            : runPreferencesOnly
            ? (
                title: l10n.onboardingOnboardingStepTitleSetYourRunPreferences,
                subtitle: l10n.onboardingOnboardingStepSubtitleWeOnlyAskFor,
              )
            : (
                title: l10n.onboardingOnboardingStepTitleYourRunningStyle,
                subtitle:
                    l10n.onboardingOnboardingStepSubtitleHelpUsFindCompatible,
              ),
    };
  }

  String appBarTitle(AppLocalizations l10n) {
    return switch (this) {
      OnboardingStep.welcome => l10n.onboardingOnboardingStepVisiblecopyWelcome,
      OnboardingStep.nameDob =>
        l10n.onboardingOnboardingStepVisiblecopyYourName,
      OnboardingStep.genderInterest =>
        l10n.onboardingOnboardingStepVisiblecopyGender,
      OnboardingStep.instagram =>
        l10n.onboardingOnboardingStepVisiblecopyInstagram,
      OnboardingStep.photos => l10n.onboardingOnboardingStepVisiblecopyPhotos,
      OnboardingStep.prompts => l10n.onboardingOnboardingStepVisiblecopyPrompts,
      OnboardingStep.runningPrefs =>
        l10n.onboardingOnboardingStepVisiblecopyRunningStyle,
    };
  }

  OnboardingStep get minimumBackStep {
    if (index >= OnboardingStep.nameDob.index) {
      return OnboardingStep.nameDob;
    }
    return OnboardingStep.welcome;
  }

  OnboardingStep? previousWithin(OnboardingStep minimumStep) {
    if (index <= minimumStep.index) {
      return null;
    }
    return OnboardingStep.values[index - 1];
  }
}
