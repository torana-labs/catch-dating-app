part of '../profile_insights.dart';

ProfileQualitySummary profileQualitySummary(PublicProfile profile) {
  final profilePhotos = profile.effectiveProfilePhotos;
  final photoCount = profilePhotos.length;
  final running = profile.activityPreferences.running;
  final promptCount = normalizeProfilePromptAnswers(
    profile.profilePrompts,
  ).length;
  final nestedPhotoPrompts = [
    for (final photo in profilePhotos)
      if (photo.prompt != null) photo.prompt!,
  ];
  final photoPromptCount = normalizePhotoPromptAnswers(
    nestedPhotoPrompts,
  ).length;
  final runningDetailsComplete =
      running.hasCurrentRunPreferences &&
      running.preferredDistances.isNotEmpty &&
      running.runningReasons.isNotEmpty &&
      running.preferredRunTimes.isNotEmpty;
  final hasBackgroundFact =
      profile.height != null ||
      _trimToNull(profile.occupation) != null ||
      _trimToNull(profile.company) != null ||
      profile.education != null ||
      profile.languages.isNotEmpty;
  final hasLifestyleFact =
      profile.drinking != null ||
      profile.smoking != null ||
      profile.workout != null ||
      profile.diet != null ||
      profile.children != null;

  final items = [
    _QualityItem(
      weight: 20,
      isComplete: photoCount >= 3,
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.photos,
      ),
    ),
    _QualityItem(
      weight: 24,
      isComplete: promptCount >= maxProfilePromptAnswers,
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.profilePrompts,
      ),
    ),
    _QualityItem(
      weight: 12,
      isComplete:
          photoCount > 0 &&
          photoPromptCount >= _targetPhotoPromptCount(photoCount),
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.photoPrompts,
      ),
    ),
    _QualityItem(
      weight: 12,
      isComplete: profile.relationshipGoal != null,
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.relationshipGoal,
      ),
    ),
    _QualityItem(
      weight: 16,
      isComplete: runningDetailsComplete,
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.runningIdentity,
      ),
    ),
    _QualityItem(
      weight: 8,
      isComplete: hasBackgroundFact,
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.backgroundDetail,
      ),
    ),
    _QualityItem(
      weight: 8,
      isComplete: hasLifestyleFact,
      suggestion: const ProfileQualitySuggestion(
        ProfileQualitySuggestionKind.lifestyleDetail,
      ),
    ),
  ];

  final score = items
      .where((item) => item.isComplete)
      .fold<int>(0, (sum, item) => sum + item.weight)
      .clamp(0, 100);
  final suggestions = items
      .where((item) => !item.isComplete)
      .map((item) => item.suggestion)
      .take(3)
      .toList(growable: false);

  return ProfileQualitySummary(
    score: score,
    completedItems: items.where((item) => item.isComplete).length,
    totalItems: items.length,
    suggestions: suggestions,
  );
}

int _targetPhotoPromptCount(int photoCount) {
  if (photoCount <= 0) return 1;
  if (photoCount == 1) return 1;
  return 2;
}

class _QualityItem {
  const _QualityItem({
    required this.weight,
    required this.isComplete,
    required this.suggestion,
  });

  final int weight;
  final bool isComplete;
  final ProfileQualitySuggestion suggestion;
}
