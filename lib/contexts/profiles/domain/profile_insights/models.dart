part of '../profile_insights.dart';

class ProfileConfidenceSignal {
  const ProfileConfidenceSignal({required this.kind, required this.label});

  final ProfileConfidenceSignalKind kind;
  final String label;
}

class EmotionalRunTag {
  const EmotionalRunTag({
    required this.kind,
    required this.label,
    required this.source,
  });

  final EmotionalRunTagKind kind;
  final String label;
  final EmotionalRunTagSource source;
}

class CompatibilityReason {
  const CompatibilityReason({required this.kind, required this.label});

  final CompatibilityReasonKind kind;
  final String label;
}

class ProfileQualitySuggestion {
  const ProfileQualitySuggestion(this.kind);

  final ProfileQualitySuggestionKind kind;
}

class ProfileQualitySummary {
  const ProfileQualitySummary({
    required this.score,
    required this.completedItems,
    required this.totalItems,
    required this.suggestions,
  });

  final int score;
  final int completedItems;
  final int totalItems;
  final List<ProfileQualitySuggestion> suggestions;

  bool get isStrong => score >= 85;
  bool get isComplete => completedItems == totalItems;
}

class ProfileCardInsights {
  const ProfileCardInsights({
    required this.quality,
    required this.confidenceSignals,
    required this.emotionalRunTags,
    required this.compatibilityReasons,
  });

  factory ProfileCardInsights.fromProfile(
    PublicProfile profile, {
    UserProfile? viewerProfile,
    String? sharedRunTitle,
  }) {
    final quality = profileQualitySummary(profile);
    return ProfileCardInsights(
      quality: quality,
      confidenceSignals: _confidenceSignals(
        profile: profile,
        quality: quality,
        sharedRunTitle: sharedRunTitle,
      ),
      emotionalRunTags: emotionalRunTagsForProfile(profile),
      compatibilityReasons: compatibilityReasonsForProfile(
        targetProfile: profile,
        viewerProfile: viewerProfile,
        sharedRunTitle: sharedRunTitle,
      ),
    );
  }

  final ProfileQualitySummary quality;
  final List<ProfileConfidenceSignal> confidenceSignals;
  final List<EmotionalRunTag> emotionalRunTags;
  final List<CompatibilityReason> compatibilityReasons;
}
