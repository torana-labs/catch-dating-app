import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/profile_requirements.g.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'onboarding_profile_draft.freezed.dart';

@freezed
abstract class OnboardingProfileDraft with _$OnboardingProfileDraft {
  const OnboardingProfileDraft._();

  const factory OnboardingProfileDraft({
    @Default('') String firstName,
    @Default('') String lastName,
    DateTime? dateOfBirth,
    @Default('') String phoneNumber,
    @Default(defaultCountryDialCode) String countryCode,
    Gender? gender,
    @Default([]) List<Gender> interestedInGenders,
    String? instagramHandle,
    @Default([]) List<ProfilePromptAnswer> profilePrompts,
  }) = _OnboardingProfileDraft;

  String get fullName => '$firstName $lastName'.trim();
}

/// Uses the same authored capability catalog as Functions and the website.
extension OnboardingProfileDraftReadiness on OnboardingProfileDraft {
  List<String> missingFields(
    String capability, {
    required DateTime today,
    Iterable<String> eventRequirements = const [],
  }) => missingProfileFields(
    capability,
    (field) => switch (field) {
      'name' => fullName.isNotEmpty,
      'phoneNumber' => phoneNumber.trim().isNotEmpty,
      'dateOfBirth' =>
        capability == 'eventBooking'
            ? dateOfBirth != null &&
                  validateOptionalDateOfBirth(dateOfBirth, today: today) == null
            : validateRequiredDateOfBirth(dateOfBirth, today: today) == null,
      'gender' => gender != null,
      'interestedInGenders' => interestedInGenders.isNotEmpty,
      _ => false,
    },
    eventRequirements: eventRequirements,
  );
}
