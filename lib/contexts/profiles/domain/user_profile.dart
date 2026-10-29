import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/labelled.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_profile.freezed.dart';
part 'user_profile.g.dart';

// ── Identity ──────────────────────────────────────────────────────────────────

enum Gender implements Labelled {
  man('Man'),
  woman('Woman'),
  nonBinary('Non-binary'),
  other('Other');

  const Gender(this.label);
  @override
  final String label;
}

// ── Background ────────────────────────────────────────────────────────────────

enum EducationLevel implements Labelled {
  highSchool('High school'),
  someCollege('Some college'),
  bachelors("Bachelor's"),
  masters("Master's"),
  phd('PhD'),
  tradeSchool('Vocational / Trade'),
  other('Other');

  const EducationLevel(this.label);
  @override
  final String label;
}

enum Religion implements Labelled {
  hindu('Hindu'),
  muslim('Muslim'),
  christian('Christian'),
  sikh('Sikh'),
  jain('Jain'),
  buddhist('Buddhist'),
  other('Other'),
  nonReligious('Non-religious');

  const Religion(this.label);
  @override
  final String label;
}

enum Language implements Labelled {
  english('English'),
  hindi('Hindi'),
  marathi('Marathi'),
  tamil('Tamil'),
  telugu('Telugu'),
  kannada('Kannada'),
  bengali('Bengali'),
  gujarati('Gujarati'),
  punjabi('Punjabi'),
  malayalam('Malayalam'),
  odia('Odia'),
  other('Other');

  const Language(this.label);
  @override
  final String label;
}

// ── Intentions ────────────────────────────────────────────────────────────────

enum RelationshipGoal implements Labelled {
  relationship('Long-term relationship'),
  casual('Something casual'),
  marriage('Marriage'),
  friendship('New friends'),
  unsure('Still figuring out');

  const RelationshipGoal(this.label);
  @override
  final String label;
}

// ── Lifestyle ─────────────────────────────────────────────────────────────────

enum DrinkingHabit implements Labelled {
  never('Never'),
  socially('Socially'),
  often('Often');

  const DrinkingHabit(this.label);
  @override
  final String label;
}

enum SmokingHabit implements Labelled {
  never('Never'),
  occasionally('Occasionally'),
  often('Often');

  const SmokingHabit(this.label);
  @override
  final String label;
}

enum WorkoutFrequency implements Labelled {
  never('Never'),
  sometimes('Sometimes'),
  often('Often'),
  everyday('Every day');

  const WorkoutFrequency(this.label);
  @override
  final String label;
}

enum DietaryPreference implements Labelled {
  omnivore('Omnivore'),
  vegetarian('Vegetarian'),
  vegan('Vegan'),
  jain('Jain'),
  other('Other');

  const DietaryPreference(this.label);
  @override
  final String label;
}

enum ChildrenStatus implements Labelled {
  dontHave("Don't have"),
  haveWantMore('Have & want more'),
  haveNoMore("Have, don't want more"),
  wantSomeday('Want someday'),
  dontWant("Don't want");

  const ChildrenStatus(this.label);
  @override
  final String label;
}

// ── Running preferences ───────────────────────────────────────────────────────

const currentRunPreferencesVersion = 1;
const defaultPaceMinSecsPerKm = 300;
const defaultPaceMaxSecsPerKm = 420;

enum PreferredDistance implements Labelled {
  fiveK('5 km'),
  tenK('10 km'),
  halfMarathon('21 km'),
  marathon('42 km');

  const PreferredDistance(this.label);
  @override
  final String label;
}

enum RunReason implements Labelled {
  fitness('Stay fit'),
  community('Community'),
  mindfulness('Mindfulness'),
  challenge('Push limits'),
  weightLoss('Weight loss'),
  raceTraining('Race training'),
  social('Make friends');

  const RunReason(this.label);
  @override
  final String label;
}

enum PreferredRunTime implements Labelled {
  earlyMorning('Early morning'),
  morning('Morning'),
  afternoon('Afternoon'),
  evening('Evening'),
  night('Night');

  const PreferredRunTime(this.label);
  @override
  final String label;
}

@freezed
abstract class RunningPreferences with _$RunningPreferences {
  const factory RunningPreferences({
    @Default(defaultPaceMinSecsPerKm) int paceMinSecsPerKm,
    @Default(defaultPaceMaxSecsPerKm) int paceMaxSecsPerKm,
    @Default([]) List<PreferredDistance> preferredDistances,
    @Default([]) List<RunReason> runningReasons,
    @Default([]) List<PreferredRunTime> preferredRunTimes,
    @JsonKey(name: 'version') @Default(0) int version,
  }) = _RunningPreferences;

  factory RunningPreferences.fromJson(Map<String, dynamic> json) =>
      _$RunningPreferencesFromJson(json);
}

@freezed
abstract class ActivityPreferences with _$ActivityPreferences {
  const factory ActivityPreferences({
    @Default(RunningPreferences()) RunningPreferences running,
  }) = _ActivityPreferences;

  factory ActivityPreferences.fromJson(Map<String, dynamic> json) =>
      _$ActivityPreferencesFromJson(json);
}

// ── Domain model ──────────────────────────────────────────────────────────────

@freezed
abstract class UserProfile with _$UserProfile {
  const UserProfile._();

  const factory UserProfile({
    // Core (required at sign-up)
    @JsonKey(includeToJson: false) required String uid,
    required String name,
    @Default('') String firstName,
    @Default('') String lastName,
    @Default('') String displayName,
    @JsonKey(includeIfNull: false)
    @NullableTimestampConverter()
    DateTime? dateOfBirth,
    @JsonKey(includeIfNull: false) Gender? gender,
    required String phoneNumber,
    @Default(defaultCountryDialCode) String countryCode,
    required bool profileComplete,

    // Optional profile/contact field. Authentication is phone-only.
    @Default('') String email,
    String? instagramHandle,

    // Personality prompts
    @Default([]) List<ProfilePromptAnswer> profilePrompts,

    // Photos
    @Default([]) List<ProfilePhoto> profilePhotos,

    // Location
    String? city,
    double? latitude,
    double? longitude,

    // Matching preferences are required only for social capabilities. Minimal
    // accounts can follow organizers and book unrestricted events without them.
    @Default([]) List<Gender> interestedInGenders,
    @Default(18) int minAgePreference,
    @Default(maximumPreferredMatchAge) int maxAgePreference,

    // Background (optional)
    int? height,
    String? occupation,
    String? company,
    EducationLevel? education,
    Religion? religion,
    @Default([]) List<Language> languages,

    // Intentions (optional)
    RelationshipGoal? relationshipGoal,

    // Lifestyle (optional)
    DrinkingHabit? drinking,
    SmokingHabit? smoking,
    WorkoutFrequency? workout,
    DietaryPreference? diet,
    ChildrenStatus? children,

    // Activity preferences
    @Default(ActivityPreferences()) ActivityPreferences activityPreferences,

    // Notification / discovery preferences
    @Default(true) bool prefsNewCatches,
    @Default(true) bool prefsMessages,
    @Default(true) bool prefsEventReminders,
    @Default(true) bool prefsRunStatusUpdates,
    @Default(true) bool prefsClubUpdates,
    @Default(false) bool prefsWeeklyDigest,
    @Default(true) bool prefsShowOnMap,
    @Default(false) bool prefsShowInCrossPaths,
    @Default(false) bool prefsCrossPathsInvitations,
  }) = _UserProfile;

  factory UserProfile.fromJson(Map<String, dynamic> json) =>
      _$UserProfileFromJson(_migrateUserProfileJson(json));

  int? ageOn(DateTime today) {
    final birthday = dateOfBirth;
    return birthday == null ? null : calculateAge(birthday, today: today);
  }

  String get accountDisplayName {
    final parts = [
      firstName.trim(),
      lastName.trim(),
    ].where((part) => part.isNotEmpty);
    final structuredName = parts.join(' ');
    return structuredName.isNotEmpty ? structuredName : name.trim();
  }

  String get publicDisplayName {
    final display = displayName.trim();
    if (display.isNotEmpty) return display;
    final first = firstName.trim();
    if (first.isNotEmpty) return first;
    final legacyName = name.trim();
    if (legacyName.isEmpty) return 'Runner';
    return legacyName.split(RegExp(r'\s+')).first;
  }

  String get greetingDisplayName =>
      publicDisplayName.trim().split(RegExp(r'\s+')).first;

  /// Tiny first-photo URL for avatar-scale UI. Falls back to the full photo
  /// until the backend thumbnail generation queue has backfilled old profiles.
  String? get primaryPhotoThumbnailUrl {
    final photo = effectiveProfilePhotos.firstOrNull;
    if (photo != null) {
      if (photo.thumbnailUrl.trim().isNotEmpty) return photo.thumbnailUrl;
      if (photo.url.trim().isNotEmpty) return photo.url;
    }
    return null;
  }

  List<ProfilePhoto> get effectiveProfilePhotos {
    return normalizeProfilePhotos(profilePhotos);
  }

  RunningPreferences get runningPreferences => activityPreferences.running;
  int get paceMinSecsPerKm => runningPreferences.paceMinSecsPerKm;
  int get paceMaxSecsPerKm => runningPreferences.paceMaxSecsPerKm;
  List<PreferredDistance> get preferredDistances =>
      runningPreferences.preferredDistances;
  List<RunReason> get runningReasons => runningPreferences.runningReasons;
  List<PreferredRunTime> get preferredRunTimes =>
      runningPreferences.preferredRunTimes;
  int get runPreferencesVersion => runningPreferences.version;
}

Map<String, dynamic> _migrateUserProfileJson(Map<String, dynamic> json) {
  final migrated = Map<String, dynamic>.from(json);
  final legacyBio = migrated['bio'];
  final hasStructuredPrompts =
      migrated['profilePrompts'] is List &&
      (migrated['profilePrompts'] as List).isNotEmpty;

  if (!hasStructuredPrompts &&
      legacyBio is String &&
      legacyBio.trim().isNotEmpty) {
    migrated['profilePrompts'] = profilePromptsToJson(
      normalizeProfilePromptAnswers(const [], legacyBio: legacyBio),
    );
  }

  migrated.remove('bio');
  _migrateActivityPreferences(migrated);
  return migrated;
}

void _migrateActivityPreferences(Map<String, dynamic> migrated) {
  final activityPreferences = _stringKeyedMap(migrated['activityPreferences']);
  final running = _stringKeyedMap(activityPreferences['running']);

  running['paceMinSecsPerKm'] ??=
      migrated['paceMinSecsPerKm'] ?? defaultPaceMinSecsPerKm;
  running['paceMaxSecsPerKm'] ??=
      migrated['paceMaxSecsPerKm'] ?? defaultPaceMaxSecsPerKm;
  running['preferredDistances'] ??= migrated['preferredDistances'] ?? const [];
  running['runningReasons'] ??= migrated['runningReasons'] ?? const [];
  running['preferredRunTimes'] ??= migrated['preferredRunTimes'] ?? const [];
  running['version'] ??= migrated['runPreferencesVersion'] ?? 0;

  activityPreferences['running'] = running;
  migrated['activityPreferences'] = activityPreferences;
}

Map<String, dynamic> _stringKeyedMap(Object? value) {
  if (value is Map) {
    return value.map((key, child) => MapEntry(key.toString(), child));
  }
  return <String, dynamic>{};
}
