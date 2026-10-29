import 'package:catch_dating_app/contexts/profiles/domain/profile_insights.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef ProfileCardFact = ({IconData icon, String text});
typedef ProfileCardPhoto = ({String url, PhotoPromptAnswer? prompt});

class ProfileCardContent {
  const ProfileCardContent({
    required this.primaryPhoto,
    required this.additionalPhotos,
    required this.attributes,
    required this.lifestyle,
    required this.relationshipGoal,
    required this.profilePrompts,
    required this.insights,
  });

  factory ProfileCardContent.fromProfile(
    PublicProfile profile, {
    required AppLocalizations l10n,
    UserProfile? viewerProfile,
    String? sharedRunTitle,
  }) {
    final photos = profile.effectiveProfilePhotos;
    final occupation = _trimToNull(profile.occupation);
    final company = _trimToNull(profile.company);

    final attributes = <ProfileCardFact>[
      if (profile.height != null)
        (
          icon: CatchIcons.measure,
          text: l10n.swipesProfileCardContentTextHeightCm(
            height: profile.height!,
          ),
        ),
      if (occupation != null)
        (
          icon: CatchIcons.work,
          text: company != null
              ? l10n.swipesProfileCardContentTextOccupationAtCompany(
                  occupation: occupation,
                  company: company,
                )
              : occupation,
        ),
      if (profile.education != null)
        (icon: CatchIcons.education, text: profile.education!.label),
      if (profile.religion != null)
        (icon: CatchIcons.night, text: profile.religion!.label),
      if (profile.languages.isNotEmpty)
        (
          icon: CatchIcons.language,
          text: profile.languages.map((language) => language.label).join(', '),
        ),
    ];

    final lifestyle = <ProfileCardFact>[
      if (profile.drinking != null)
        (icon: CatchIcons.drinks, text: profile.drinking!.label),
      if (profile.smoking != null)
        (icon: CatchIcons.smokeFree, text: profile.smoking!.label),
      if (profile.workout != null)
        (icon: CatchIcons.fitness, text: profile.workout!.label),
      if (profile.diet != null)
        (icon: CatchIcons.sustainability, text: profile.diet!.label),
      if (profile.children != null)
        (icon: CatchIcons.kids, text: profile.children!.label),
    ];

    final additionalPhotos = photos.indexed
        .skip(1)
        .map((photo) => (url: photo.$2.url, prompt: photo.$2.prompt))
        .toList(growable: false);

    return ProfileCardContent(
      primaryPhoto: photos.firstOrNull == null
          ? null
          : (url: photos.first.url, prompt: photos.first.prompt),
      additionalPhotos: additionalPhotos,
      attributes: attributes,
      lifestyle: lifestyle,
      relationshipGoal: profile.relationshipGoal,
      profilePrompts: normalizeProfilePromptAnswers(profile.profilePrompts),
      insights: ProfileCardInsights.fromProfile(
        profile,
        viewerProfile: viewerProfile,
        sharedRunTitle: sharedRunTitle,
      ),
    );
  }

  final ProfileCardPhoto? primaryPhoto;
  final List<ProfileCardPhoto> additionalPhotos;
  final List<ProfileCardFact> attributes;
  final List<ProfileCardFact> lifestyle;
  final RelationshipGoal? relationshipGoal;
  final List<ProfilePromptAnswer> profilePrompts;
  final ProfileCardInsights insights;

  String? get primaryPhotoUrl => primaryPhoto?.url;

  bool get hasProfilePrompts => profilePrompts.isNotEmpty;
}

String? _trimToNull(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  return trimmed;
}
