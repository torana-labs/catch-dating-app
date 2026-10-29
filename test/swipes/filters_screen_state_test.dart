import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('FiltersPreferencesState derives defaults and save request fields', () {
    final user = buildUser().copyWith(
      minAgePreference: 24,
      maxAgePreference: 34,
      interestedInGenders: const [Gender.woman],
    );

    final state = FiltersPreferencesState.fromProfile(
      user: user,
      draftAgeRange: const RangeValues(25, 60),
      draftInterestedIn: const {Gender.woman, Gender.nonBinary},
      saving: false,
    );

    expect(state.savedAgeRange, const RangeValues(24, 34));
    expect(state.savedInterestedIn, {Gender.woman});
    expect(state.content.ageRange, const RangeValues(25, 60));
    expect(state.content.interestedIn, {Gender.woman, Gender.nonBinary});
    expect(state.content.saving, isFalse);
    expect(state.isDirty, isTrue);
    expect(state.resetEnabled, isTrue);
    expect(state.applyEnabled, isTrue);
    expect(state.requestControlsEnabled, isTrue);
    expect(state.saveRequest.uid, user.uid);
    expect(state.saveRequest.minAgePreference, 25);
    expect(state.saveRequest.maxAgePreference, 99);
    expect(state.saveRequest.interestedInGenderNames, ['woman', 'nonBinary']);
  });

  test('FiltersPreferencesState keeps pending mutation controls disabled', () {
    final user = buildUser().copyWith(
      minAgePreference: 18,
      maxAgePreference: 99,
      interestedInGenders: const [Gender.man],
    );

    final state = FiltersPreferencesState.fromProfile(user: user, saving: true);

    expect(state.content.ageRange, const RangeValues(18, 60));
    expect(state.content.interestedIn, {Gender.man});
    expect(state.isDirty, isFalse);
    expect(state.resetEnabled, isFalse);
    expect(state.applyEnabled, isFalse);
    expect(state.requestControlsEnabled, isFalse);
    expect(state.content.saving, isTrue);
  });
}
