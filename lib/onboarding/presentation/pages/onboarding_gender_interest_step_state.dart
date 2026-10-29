import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';

class OnboardingGenderInterestState {
  const OnboardingGenderInterestState({
    required this.gender,
    required this.interestedIn,
    required this.isSaving,
    required this.saveErrorMessage,
    required this.genderValidationMessage,
    required this.interestValidationMessage,
  });

  factory OnboardingGenderInterestState.fromDraft({
    required Gender? gender,
    required Iterable<Gender> interestedIn,
    required AppLocalizations l10n,
    bool isSaving = false,
    String? saveErrorMessage,
  }) {
    return OnboardingGenderInterestState(
      gender: gender,
      interestedIn: Set<Gender>.unmodifiable(interestedIn),
      isSaving: isSaving,
      saveErrorMessage: saveErrorMessage,
      genderValidationMessage: l10n.onboardingGenderValidationSelectGender,
      interestValidationMessage: l10n.onboardingGenderValidationSelectInterest,
    );
  }

  final Gender? gender;
  final Set<Gender> interestedIn;
  final bool isSaving;
  final String? saveErrorMessage;
  final String genderValidationMessage;
  final String interestValidationMessage;

  Set<Gender> get selectedGender =>
      gender == null ? const <Gender>{} : {gender!};

  bool get hasSaveError => saveErrorMessage != null;

  bool get requestControlsEnabled => !isSaving;

  bool get canSubmit => requestControlsEnabled;

  String? validateGender(Set<Gender>? value) =>
      gender == null ? genderValidationMessage : null;

  String? validateInterestedIn(Set<Gender>? value) =>
      interestedIn.isEmpty ? interestValidationMessage : null;

  OnboardingGenderInterestSubmitIntent? submitIntent() {
    final gender = this.gender;
    if (gender == null || interestedIn.isEmpty) return null;
    return OnboardingGenderInterestSubmitIntent(
      gender: gender,
      interestedInGenders: List<Gender>.unmodifiable(interestedIn),
    );
  }
}

class OnboardingGenderInterestSubmitIntent {
  const OnboardingGenderInterestSubmitIntent({
    required this.gender,
    required this.interestedInGenders,
  });

  final Gender gender;
  final List<Gender> interestedInGenders;
}

class OnboardingGenderInterestCallbacks {
  const OnboardingGenderInterestCallbacks({
    required this.onGenderChanged,
    required this.onInterestedInChanged,
    required this.onContinue,
  });

  final void Function(Set<Gender> next) onGenderChanged;
  final void Function(Set<Gender> next) onInterestedInChanged;
  final void Function() onContinue;
}
