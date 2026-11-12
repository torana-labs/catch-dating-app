import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final l10n = AppLocalizationsEn();

  group('OnboardingStepX', () {
    test('shows progress for every step after welcome', () {
      expect(OnboardingStep.welcome.showsProgress, isFalse);
      expect(OnboardingStep.nameDob.showsProgress, isTrue);
      expect(OnboardingStep.runningPrefs.showsProgress, isTrue);
    });

    test('locks back navigation to name step once profile steps begin', () {
      expect(OnboardingStep.welcome.minimumBackStep, OnboardingStep.welcome);
      expect(OnboardingStep.nameDob.minimumBackStep, OnboardingStep.nameDob);
      expect(
        OnboardingStep.runningPrefs.minimumBackStep,
        OnboardingStep.nameDob,
      );
    });

    test('returns the previous step only when still above the minimum', () {
      expect(
        OnboardingStep.genderInterest.previousWithin(OnboardingStep.welcome),
        OnboardingStep.nameDob,
      );
      expect(
        OnboardingStep.nameDob.previousWithin(OnboardingStep.nameDob),
        isNull,
      );
      expect(
        OnboardingStep.photos.previousWithin(OnboardingStep.nameDob),
        OnboardingStep.instagram,
      );
    });
  });

  group('OnboardingStepX.headerCopy', () {
    ({String title, String? subtitle}) copy(
      OnboardingStep step, {
      bool profileCompletionOnly = false,
      bool runPreferencesOnly = false,
    }) => step.headerCopy(
      l10n: l10n,
      profileCompletionOnly: profileCompletionOnly,
      runPreferencesOnly: runPreferencesOnly,
    );

    test('surfaces the question and supporting line per step', () {
      expect(copy(OnboardingStep.nameDob).title, "What's your name?");
      expect(
        copy(OnboardingStep.nameDob).subtitle,
        'Last name stays private until you message someone.',
      );
      expect(copy(OnboardingStep.genderInterest).title, 'How do you identify?');
      expect(copy(OnboardingStep.genderInterest).subtitle, isNull);
      expect(copy(OnboardingStep.instagram).title, 'Your Instagram');
    });

    test('photos/prompts switch copy in profile-completion mode', () {
      expect(copy(OnboardingStep.photos).title, 'Show yourself');
      expect(
        copy(OnboardingStep.photos, profileCompletionOnly: true).title,
        'Complete your profile to stay in touch',
      );
      expect(copy(OnboardingStep.prompts).title, 'Show your personality');
      expect(
        copy(OnboardingStep.prompts, profileCompletionOnly: true).title,
        'Add prompts so people know you',
      );
    });

    test('running prefs distinguishes completion vs run-only entry', () {
      expect(copy(OnboardingStep.runningPrefs).title, 'Your running style');
      expect(
        copy(OnboardingStep.runningPrefs, profileCompletionOnly: true).title,
        'Finish your profile',
      );
      expect(
        copy(OnboardingStep.runningPrefs, runPreferencesOnly: true).title,
        'Set your run preferences',
      );
    });
  });
}
