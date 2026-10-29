import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/profile_requirements.g.dart';

extension UserProfileReadiness on UserProfile {
  bool get hasAccountReadyIdentity => missingProfileFields(
    'account',
    (field) => switch (field) {
      'name' => hasBookingReadyName,
      'phoneNumber' => validateRequiredPhoneNumber(phoneNumber) == null,
      _ => false,
    },
  ).isEmpty;

  bool hasBookingReadyIdentityOn(
    DateTime today, {
    bool ageRestricted = false,
    bool cohortRestricted = false,
  }) => missingProfileFields(
    'eventBooking',
    (field) => switch (field) {
      'name' => hasBookingReadyName,
      'phoneNumber' => validateRequiredPhoneNumber(phoneNumber) == null,
      'dateOfBirth' => dateOfBirth != null && !dateOfBirth!.isAfter(today),
      'gender' => gender != null,
      'interestedInGenders' => interestedInGenders.isNotEmpty,
      _ => false,
    },
    eventRequirements: [
      if (ageRestricted) 'ageRestricted',
      if (cohortRestricted) 'cohortRestricted',
    ],
  ).isEmpty;

  bool get hasBookingReadyName {
    return name.trim().isNotEmpty ||
        firstName.trim().isNotEmpty ||
        displayName.trim().isNotEmpty;
  }

  bool hasSocialReadyProfileOn(DateTime today) {
    return missingProfileFields(
      'socialDiscovery',
      (field) => switch (field) {
        'name' => hasBookingReadyName,
        'phoneNumber' => validateRequiredPhoneNumber(phoneNumber) == null,
        'dateOfBirth' =>
          validateRequiredDateOfBirth(dateOfBirth, today: today) == null,
        'gender' => gender != null,
        'interestedInGenders' => interestedInGenders.isNotEmpty,
        'profileComplete' => profileComplete,
        'profilePhotos' => hasMinimumSocialPhotos,
        'profilePrompts' => hasRequiredProfilePrompts,
        _ => false,
      },
    ).isEmpty;
  }

  bool get hasCurrentRunPreferences {
    return runningPreferences.hasCurrentRunPreferences;
  }

  bool get hasLegacyRunPreferenceSelections {
    return runningPreferences.hasLegacyRunPreferenceSelections;
  }

  bool get hasMinimumSocialPhotos =>
      effectiveProfilePhotos.length >= minimumProfilePhotoCount;

  bool get hasRequiredProfilePrompts {
    final answeredPromptIds = normalizeProfilePromptAnswers(
      profilePrompts,
    ).map((answer) => answer.promptId).toSet();
    // The prompts UI lets users freely swap any default slot for another
    // catalog prompt, so readiness requires N distinct answered prompts rather
    // than the specific default ids — otherwise choosing a non-default prompt
    // soft-locks profile completion (the router redirect never resolves).
    return answeredPromptIds.length >= maxProfilePromptAnswers;
  }
}

extension RunningPreferencesReadiness on RunningPreferences {
  bool get hasCurrentRunPreferences {
    return version >= currentRunPreferencesVersion ||
        hasLegacyRunPreferenceSelections;
  }

  bool get hasLegacyRunPreferenceSelections {
    return preferredDistances.isNotEmpty ||
        runningReasons.isNotEmpty ||
        preferredRunTimes.isNotEmpty ||
        paceMinSecsPerKm != defaultPaceMinSecsPerKm ||
        paceMaxSecsPerKm != defaultPaceMaxSecsPerKm;
  }
}
