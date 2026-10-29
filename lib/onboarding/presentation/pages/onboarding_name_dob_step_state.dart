import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/profile_requirements.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:flutter/material.dart';

class OnboardingNameDobState {
  const OnboardingNameDobState({
    this.profileCompletionOnly = false,
    this.eventRequirements,
    this.isSaving = false,
    this.saveErrorMessage,
    required this.firstName,
    required this.lastName,
    required this.phoneNumber,
    required this.countryCode,
    required this.dateOfBirth,
    required this.step,
    required this.today,
    required this.datePickerTitle,
    required this.firstNameValidationLabel,
    required this.lastNameValidationLabel,
  });

  factory OnboardingNameDobState.fromDraft({
    bool profileCompletionOnly = false,
    List<String>? eventRequirements,
    bool isSaving = false,
    String? saveErrorMessage,
    required String firstName,
    required String lastName,
    required String phoneNumber,
    required String countryCode,
    required DateTime? dateOfBirth,
    required OnboardingStep step,
    required DateTime today,
    required AppLocalizations l10n,
  }) {
    return OnboardingNameDobState(
      profileCompletionOnly: profileCompletionOnly,
      eventRequirements: eventRequirements,
      isSaving: isSaving,
      saveErrorMessage: saveErrorMessage,
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      countryCode: countryCode,
      dateOfBirth: dateOfBirth,
      step: step,
      today: today,
      datePickerTitle: l10n.onboardingNameDobPageStateVisiblecopyDateOfBirth,
      firstNameValidationLabel:
          l10n.onboardingNameDobPageStateVisiblecopyFirstName,
      lastNameValidationLabel:
          l10n.onboardingNameDobPageStateVisiblecopyLastName,
    );
  }

  final bool profileCompletionOnly;
  final bool isSaving;
  final String? saveErrorMessage;
  final List<String>? eventRequirements;
  bool get birthdayRequired => eventRequirements != null
      ? eventRequirements!.any(
          (requirement) =>
              eventProfileRequirements[requirement]!.contains('dateOfBirth'),
        )
      : profileRequiredFields[profileCompletionOnly
                ? 'socialIdentity'
                : 'account']!
            .contains('dateOfBirth');
  int get minimumAge => profileCompletionOnly && eventRequirements == null
      ? minimumProfileAge
      : 0;

  final String firstName;
  final String lastName;
  final String phoneNumber;
  final String countryCode;
  final DateTime? dateOfBirth;
  final OnboardingStep step;
  final DateTime today;
  final String datePickerTitle;
  final String firstNameValidationLabel;
  final String lastNameValidationLabel;

  bool get shouldAutofocus => step == OnboardingStep.nameDob;

  String get phonePrefix => '$countryCode ';

  int? get age =>
      dateOfBirth == null ? null : calculateAge(dateOfBirth!, today: today);

  String? get ageSuffix => age == null ? null : 'AGE $age';

  String get dateText => dateOfBirth == null ? '' : formatDate(dateOfBirth!);

  OnboardingNameDobDatePickerRequest get datePickerRequest {
    return OnboardingNameDobDatePickerRequest(
      initialDate:
          (dateOfBirth != null &&
              !dateOfBirth!.isAfter(
                latestAllowedDateOfBirth(today: today, minimumAge: minimumAge),
              ))
          ? dateOfBirth!
          : DateTime(2000),
      firstDate: DateTime(1920),
      lastDate: latestAllowedDateOfBirth(today: today, minimumAge: minimumAge),
      title: datePickerTitle,
    );
  }

  String? validateFirstName(String? value) =>
      validateRequiredProfileName(value, label: firstNameValidationLabel);

  String? validateLastName(String? value) => null;

  String? validateDateOfBirth() {
    if (birthdayRequired && (dateOfBirth == null || minimumAge > 0)) {
      return validateRequiredDateOfBirth(dateOfBirth, today: today);
    }
    return validateOptionalDateOfBirth(dateOfBirth, today: today);
  }

  String? validatePhoneNumber(String? value) =>
      validateRequiredPhoneNumber(value);

  OnboardingNameDobSubmitIntent? submitIntent({
    required String firstName,
    required String lastName,
    required String phoneNumber,
  }) {
    final dateOfBirth = this.dateOfBirth;
    if (validateDateOfBirth() != null) return null;

    return OnboardingNameDobSubmitIntent(
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      countryCode: countryCode,
      dateOfBirth: dateOfBirth,
    );
  }

  static String formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '$day ${months[date.month - 1]} ${date.year}';
  }
}

class OnboardingNameDobDatePickerRequest {
  const OnboardingNameDobDatePickerRequest({
    required this.initialDate,
    required this.firstDate,
    required this.lastDate,
    required this.title,
  });

  final DateTime initialDate;
  final DateTime firstDate;
  final DateTime lastDate;
  final String title;
}

class OnboardingNameDobSubmitIntent {
  const OnboardingNameDobSubmitIntent({
    required this.firstName,
    required this.lastName,
    required this.phoneNumber,
    required this.countryCode,
    required this.dateOfBirth,
  });

  final String firstName;
  final String lastName;
  final String phoneNumber;
  final String countryCode;
  final DateTime? dateOfBirth;
}

class OnboardingNameDobTextControllers {
  const OnboardingNameDobTextControllers({
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.date,
  });

  final TextEditingController firstName;
  final TextEditingController lastName;
  final TextEditingController phone;
  final TextEditingController date;
}

class OnboardingNameDobCallbacks {
  const OnboardingNameDobCallbacks({
    required this.onPickDate,
    required this.onContinue,
  });

  final void Function(OnboardingNameDobDatePickerRequest request) onPickDate;
  final VoidCallback onContinue;
}
