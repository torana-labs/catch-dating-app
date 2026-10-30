import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;

class SelfProfileInlineEditPatchFactory {
  const SelfProfileInlineEditPatchFactory();

  UpdateUserProfilePatch displayName(Object? value) {
    return UpdateUserProfilePatch(displayName: value as String);
  }

  UpdateUserProfilePatch email(Object? value) {
    return UpdateUserProfilePatch(email: value as String);
  }

  UpdateUserProfilePatch instagramHandle(Object? value) {
    return UpdateUserProfilePatch(instagramHandle: value as String?);
  }

  UpdateUserProfilePatch height(int? value) {
    return UpdateUserProfilePatch(height: value);
  }

  UpdateUserProfilePatch city(CityOption? value) {
    return UpdateUserProfilePatch(city: value?.effectiveMarketId);
  }

  UpdateUserProfilePatch occupation(Object? value) {
    return UpdateUserProfilePatch(occupation: value as String?);
  }

  UpdateUserProfilePatch company(Object? value) {
    return UpdateUserProfilePatch(company: value as String?);
  }

  UpdateUserProfilePatch education(EducationLevel? value) {
    return UpdateUserProfilePatch(education: value);
  }

  UpdateUserProfilePatch religion(Religion? value) {
    return UpdateUserProfilePatch(religion: value);
  }

  UpdateUserProfilePatch languages(List<Language> values) {
    return UpdateUserProfilePatch(languages: values);
  }

  UpdateUserProfilePatch relationshipGoal(RelationshipGoal? value) {
    return UpdateUserProfilePatch(relationshipGoal: value);
  }

  UpdateUserProfilePatch drinking(DrinkingHabit? value) {
    return UpdateUserProfilePatch(drinking: value);
  }

  UpdateUserProfilePatch smoking(SmokingHabit? value) {
    return UpdateUserProfilePatch(smoking: value);
  }

  UpdateUserProfilePatch workout(WorkoutFrequency? value) {
    return UpdateUserProfilePatch(workout: value);
  }

  UpdateUserProfilePatch diet(DietaryPreference? value) {
    return UpdateUserProfilePatch(diet: value);
  }

  UpdateUserProfilePatch children(ChildrenStatus? value) {
    return UpdateUserProfilePatch(children: value);
  }

  UpdateUserProfilePatch paceRange(UserProfile user, int min, int max) {
    return _runningActivityPatch(
      user,
      (running) => running.copyWith(
        paceMinSecsPerKm: min,
        paceMaxSecsPerKm: max,
        version: currentRunPreferencesVersion,
      ),
    );
  }

  UpdateUserProfilePatch preferredDistances(
    UserProfile user,
    List<PreferredDistance> values,
  ) {
    return _runningActivityPatch(
      user,
      (running) => running.copyWith(
        preferredDistances: values,
        version: currentRunPreferencesVersion,
      ),
    );
  }

  UpdateUserProfilePatch runningReasons(
    UserProfile user,
    List<RunReason> values,
  ) {
    return _runningActivityPatch(
      user,
      (running) => running.copyWith(
        runningReasons: values,
        version: currentRunPreferencesVersion,
      ),
    );
  }

  UpdateUserProfilePatch preferredRunTimes(
    UserProfile user,
    List<PreferredRunTime> values,
  ) {
    return _runningActivityPatch(
      user,
      (running) => running.copyWith(
        preferredRunTimes: values,
        version: currentRunPreferencesVersion,
      ),
    );
  }

  UpdateUserProfilePatch _runningActivityPatch(
    UserProfile user,
    RunningPreferences Function(RunningPreferences running) update,
  ) {
    return UpdateUserProfilePatch(
      activityPreferences: user.activityPreferences.copyWith(
        running: update(user.runningPreferences),
      ),
    );
  }
}
