// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/kernel/sentinels.dart';
import 'package:cloud_firestore/cloud_firestore.dart';


// Typed callable request DTO emitted from patches/update_user_profile.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Typed patch helper generated from Callable request body for updateUserProfile. Values are normalized before Firestore writes.
final class UpdateUserProfilePatch {
  UpdateUserProfilePatch({
    String? name,
    String? displayName,
    String? email,
    Object? instagramHandle = unsetSentinel,
    List<ProfilePromptAnswer>? profilePrompts,
    DateTime? dateOfBirth,
    Gender? gender,
    bool? profileComplete,
    List<ProfilePhoto>? profilePhotos,
    Object? city = unsetSentinel,
    Object? latitude = unsetSentinel,
    Object? longitude = unsetSentinel,
    List<Gender>? interestedInGenders,
    int? minAgePreference,
    int? maxAgePreference,
    Object? height = unsetSentinel,
    Object? occupation = unsetSentinel,
    Object? company = unsetSentinel,
    Object? education = unsetSentinel,
    Object? religion = unsetSentinel,
    List<Language>? languages,
    Object? relationshipGoal = unsetSentinel,
    Object? drinking = unsetSentinel,
    Object? smoking = unsetSentinel,
    Object? workout = unsetSentinel,
    Object? diet = unsetSentinel,
    Object? children = unsetSentinel,
    ActivityPreferences? activityPreferences,
    bool? prefsNewCatches,
    bool? prefsMessages,
    bool? prefsEventReminders,
    bool? prefsRunStatusUpdates,
    bool? prefsClubUpdates,
    bool? prefsWeeklyDigest,
    bool? prefsShowOnMap,
    bool? prefsShowInCrossPaths,
    bool? prefsCrossPathsInvitations,
  }) : _fields = {
         if (name != null)
           'name': name,
         if (displayName != null)
           'displayName': displayName,
         if (email != null)
           'email': email,
         if (!identical(instagramHandle, unsetSentinel))
           'instagramHandle': instagramHandle,
         if (profilePrompts != null)
           'profilePrompts': profilePrompts.map((e) => _updateUserProfilePatchJsonValue(e.toJson())).toList(),
         if (dateOfBirth != null)
           'dateOfBirth': dateOfBirth.millisecondsSinceEpoch,
         if (gender != null)
           'gender': gender.name,
         if (profileComplete != null)
           'profileComplete': profileComplete,
         if (profilePhotos != null)
           'profilePhotos': profilePhotos.map((e) => _updateUserProfilePatchJsonValue(e.toJson())).toList(),
         if (!identical(city, unsetSentinel))
           'city': city,
         if (!identical(latitude, unsetSentinel))
           'latitude': latitude,
         if (!identical(longitude, unsetSentinel))
           'longitude': longitude,
         if (interestedInGenders != null)
           'interestedInGenders': interestedInGenders.map((e) => e.name).toList(),
         if (minAgePreference != null)
           'minAgePreference': minAgePreference,
         if (maxAgePreference != null)
           'maxAgePreference': maxAgePreference,
         if (!identical(height, unsetSentinel))
           'height': height,
         if (!identical(occupation, unsetSentinel))
           'occupation': occupation,
         if (!identical(company, unsetSentinel))
           'company': company,
         if (!identical(education, unsetSentinel))
           'education': (education as EducationLevel?)?.name,
         if (!identical(religion, unsetSentinel))
           'religion': (religion as Religion?)?.name,
         if (languages != null)
           'languages': languages.map((e) => e.name).toList(),
         if (!identical(relationshipGoal, unsetSentinel))
           'relationshipGoal': (relationshipGoal as RelationshipGoal?)?.name,
         if (!identical(drinking, unsetSentinel))
           'drinking': (drinking as DrinkingHabit?)?.name,
         if (!identical(smoking, unsetSentinel))
           'smoking': (smoking as SmokingHabit?)?.name,
         if (!identical(workout, unsetSentinel))
           'workout': (workout as WorkoutFrequency?)?.name,
         if (!identical(diet, unsetSentinel))
           'diet': (diet as DietaryPreference?)?.name,
         if (!identical(children, unsetSentinel))
           'children': (children as ChildrenStatus?)?.name,
         if (activityPreferences != null)
           'activityPreferences': activityPreferences.toJson(),
         if (prefsNewCatches != null)
           'prefsNewCatches': prefsNewCatches,
         if (prefsMessages != null)
           'prefsMessages': prefsMessages,
         if (prefsEventReminders != null)
           'prefsEventReminders': prefsEventReminders,
         if (prefsRunStatusUpdates != null)
           'prefsRunStatusUpdates': prefsRunStatusUpdates,
         if (prefsClubUpdates != null)
           'prefsClubUpdates': prefsClubUpdates,
         if (prefsWeeklyDigest != null)
           'prefsWeeklyDigest': prefsWeeklyDigest,
         if (prefsShowOnMap != null)
           'prefsShowOnMap': prefsShowOnMap,
         if (prefsShowInCrossPaths != null)
           'prefsShowInCrossPaths': prefsShowInCrossPaths,
         if (prefsCrossPathsInvitations != null)
           'prefsCrossPathsInvitations': prefsCrossPathsInvitations,
       };

  /// Escape hatch for callers that compute the field key dynamically.
  /// Prefer the typed constructor for app presentation and repository code.
  UpdateUserProfilePatch.raw(Map<String, Object?> fields)
    : _fields = Map<String, Object?>.from(fields);

  final Map<String, Object?> _fields;

  Iterable<String> get keys => _fields.keys;

  bool get isEmpty => _fields.isEmpty;
  bool get isNotEmpty => _fields.isNotEmpty;

  Map<String, Object?> toFieldsJson() =>
      Map<String, Object?>.unmodifiable(_fields);

  Map<String, Object?> toCallableJson() => {
    'fields': toFieldsJson(),
  };
}


Object? _updateUserProfilePatchJsonValue(Object? value) {
  if (value is Timestamp) return value.millisecondsSinceEpoch;
  if (value is DateTime) return value.millisecondsSinceEpoch;
  if (value is Iterable) {
    return value.map(_updateUserProfilePatchJsonValue).toList();
  }
  if (value is Map) {
    return value.map(
      (key, child) => MapEntry(key, _updateUserProfilePatchJsonValue(child)),
    );
  }
  return value;
}
