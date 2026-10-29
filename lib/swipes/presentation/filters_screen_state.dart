import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter/material.dart' show RangeValues;

class FiltersPreferencesState {
  const FiltersPreferencesState({
    required this.user,
    required this.savedAgeRange,
    required this.savedInterestedIn,
    required this.content,
    required this.resetEnabled,
    required this.applyEnabled,
  });

  factory FiltersPreferencesState.fromProfile({
    required UserProfile user,
    RangeValues? draftAgeRange,
    Set<Gender>? draftInterestedIn,
    required bool saving,
  }) {
    final savedAgeRange = filtersAgeRangeValues(user);
    final savedInterestedIn = user.interestedInGenders.toSet();
    final content = FiltersBodyState(
      ageRange: draftAgeRange ?? savedAgeRange,
      interestedIn: draftInterestedIn ?? savedInterestedIn,
      saving: saving,
    );

    return FiltersPreferencesState(
      user: user,
      savedAgeRange: savedAgeRange,
      savedInterestedIn: savedInterestedIn,
      content: content,
      resetEnabled: !saving,
      applyEnabled: !saving,
    );
  }

  final UserProfile user;
  final RangeValues savedAgeRange;
  final Set<Gender> savedInterestedIn;
  final FiltersBodyState content;
  final bool resetEnabled;
  final bool applyEnabled;

  bool get requestControlsEnabled => !content.saving;

  bool get isDirty {
    return content.ageRange.start.round() != savedAgeRange.start.round() ||
        content.ageRange.end.round() != savedAgeRange.end.round() ||
        !_sameGenderSet(content.interestedIn, savedInterestedIn);
  }

  FiltersSaveRequest get saveRequest {
    return FiltersSaveRequest(
      uid: user.uid,
      minAgePreference: content.ageRange.start.round(),
      maxAgePreference: preferredMatchAgeStorageValue(
        content.ageRange.end.round(),
      ),
      interestedInGenderNames: [
        for (final gender in content.interestedIn) gender.name,
      ],
    );
  }
}

class FiltersBodyState {
  const FiltersBodyState({
    required this.ageRange,
    required this.interestedIn,
    required this.saving,
  });

  final RangeValues ageRange;
  final Set<Gender> interestedIn;
  final bool saving;
}

class FiltersSaveRequest {
  const FiltersSaveRequest({
    required this.uid,
    required this.minAgePreference,
    required this.maxAgePreference,
    required this.interestedInGenderNames,
  });

  final String uid;
  final int minAgePreference;
  final int maxAgePreference;
  final List<String> interestedInGenderNames;
}

RangeValues filtersAgeRangeValues(UserProfile user) {
  final range = normalizeAgePreferenceRange(
    minAgePreference: user.minAgePreference,
    maxAgePreference: user.maxAgePreference,
  );
  return RangeValues(
    range.minAge.toDouble(),
    range.maxAge
        .clamp(minimumProfileAge, preferredMatchAgeOpenEndedDisplayAge)
        .toDouble(),
  );
}

bool _sameGenderSet(Set<Gender> left, Set<Gender> right) {
  if (left.length != right.length) return false;
  return left.containsAll(right);
}
