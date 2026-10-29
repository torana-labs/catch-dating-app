import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/format_utils.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_card_content.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Maps [ProfileCardContent] (which already projects a `PublicProfile` into
/// display content + insights) onto the section-based [ProfileView] the flagship
/// renders. Section order mirrors the handoff profile template:
/// compatibility, prompts, running, photos, details, then lifestyle.
ProfileView profileViewFromCardContent(
  ProfileCardContent content, {
  required AppLocalizations l10n,
  required String name,
  required int age,
  required RunningPreferences running,
  String? kicker,
  ActivityKind? kickerActivity,
  String? metaLine,
}) {
  final sections = <ProfileSectionData>[];

  // 1 · Compatibility / match signals.
  final confidence = content.insights.confidenceSignals
      .map((signal) => signal.label)
      .toList();
  final reasons = content.insights.compatibilityReasons
      .map((reason) => reason.label)
      .toList();
  if (confidence.isNotEmpty || reasons.isNotEmpty) {
    final title = reasons.isEmpty
        ? l10n.swipesProfileViewMapperTitleProfileSignals
        : l10n.swipesProfileViewMapperTitleWhyYouMightClick;
    sections.add(
      ProfileCompatibilitySectionData(
        title: title,
        reasons: reasons,
        confidence: confidence,
        reaction: _target(
          l10n.swipesProfileViewMapperVisiblecopyCompatibility,
          SwipeReactionTargetType.compatibility,
          title,
          [...confidence, ...reasons].join(' · '),
        ),
      ),
    );
  }

  // 2 · Prompts.
  for (final prompt in content.profilePrompts) {
    sections.add(
      ProfilePromptSectionData(
        question: prompt.displayPrompt,
        answer: prompt.answer,
        reaction: _target(
          l10n.swipesProfileViewMapperVisiblecopyProfilePromptPromptid(
            promptId: prompt.promptId,
          ),
          SwipeReactionTargetType.profilePrompt,
          prompt.displayPrompt,
          prompt.answer,
        ),
      ),
    );
  }

  // 3 · Running identity.
  if (running.hasCurrentRunPreferences) {
    sections.add(
      ProfileRunningSectionData(
        pace: formatPaceRange(
          running.paceMinSecsPerKm,
          running.paceMaxSecsPerKm,
        ),
        distance: _distanceSummary(running),
        reasons: running.runningReasons.map((reason) => reason.label).toList(),
        times: running.preferredRunTimes.map((time) => time.label).toList(),
        tags: content.insights.emotionalRunTags
            .map((tag) => tag.label)
            .toList(),
        reaction: _target(
          l10n.swipesProfileViewMapperVisiblecopyRunning,
          SwipeReactionTargetType.running,
          l10n.swipesProfileViewMapperVisiblecopyRunningRhythm,
          _runningPreview(running),
        ),
      ),
    );
  }

  final additional = content.additionalPhotos;

  // 4 · Inset photos.
  for (final (index, photo) in additional.indexed) {
    sections.add(_photoSection(name, photo, ordinal: index + 2));
  }

  // 5 · Details.
  final detailsFacts = _detailsFacts(content);
  if (detailsFacts.isNotEmpty) {
    sections.add(
      ProfileFactsSectionData(
        title: l10n.swipesProfileViewMapperTitleDetails,
        facts: detailsFacts,
        reaction: _target(
          l10n.swipesProfileViewMapperVisiblecopyDetails,
          SwipeReactionTargetType.details,
          l10n.swipesProfileViewMapperVisiblecopyDetails4d7b56,
          detailsFacts.map((fact) => fact.text).join(' · '),
        ),
      ),
    );
  }

  // 6 · Lifestyle.
  if (content.lifestyle.isNotEmpty) {
    sections.add(
      ProfileFactsSectionData(
        title: l10n.swipesProfileViewMapperTitleLifestyle,
        facts: content.lifestyle
            .map((fact) => ProfileFact(icon: fact.icon, text: fact.text))
            .toList(),
        reaction: _target(
          l10n.swipesProfileViewMapperVisiblecopyLifestyle,
          SwipeReactionTargetType.lifestyle,
          l10n.swipesProfileViewMapperVisiblecopyLifestyle900024,
          content.lifestyle.map((fact) => fact.text).join(' · '),
        ),
      ),
    );
  }

  final hero = content.primaryPhoto;
  return ProfileView(
    name: name,
    age: age,
    heroPhoto: hero == null ? null : _profileImageProvider(hero.url),
    heroReaction: hero == null
        ? null
        : _target(
            l10n.swipesProfileViewMapperVisiblecopyHeroPhoto,
            SwipeReactionTargetType.heroPhoto,
            l10n.swipesProfileViewMapperVisiblecopyMainPhoto,
            _photoPreview(
              name,
              l10n.swipesProfileViewMapperVisiblecopyMainProfilePhoto,
              hero.prompt,
            ),
          ),
    kicker: kicker,
    kickerActivity: kickerActivity,
    metaLine: metaLine,
    sections: sections,
  );
}

List<ProfileFact> _detailsFacts(ProfileCardContent content) {
  return [
    if (content.relationshipGoal case final goal?)
      ProfileFact(icon: CatchIcons.like, text: goal.label),
    for (final fact in content.attributes)
      ProfileFact(icon: fact.icon, text: fact.text),
  ];
}

ProfilePhotoSectionData _photoSection(
  String name,
  ProfileCardPhoto photo, {
  required int ordinal,
}) {
  final ordinalLabel = ordinal == 2
      ? 'second profile photo'
      : 'profile photo $ordinal';
  return ProfilePhotoSectionData(
    image: _profileImageProvider(photo.url),
    caption: photo.prompt?.displayPrompt,
    reaction: _target(
      'photo-$ordinal',
      SwipeReactionTargetType.photo,
      'Photo $ordinal',
      _photoPreview(name, ordinalLabel, photo.prompt),
    ),
  );
}

ProfileReactionTarget _target(
  String id,
  SwipeReactionTargetType type,
  String label,
  String preview,
) => ProfileReactionTarget(
  id: id,
  type: type,
  label: label,
  preview: _truncatePreview(preview),
);

ImageProvider<Object> _profileImageProvider(String url) {
  final trimmed = url.trim();
  if (trimmed.startsWith('assets/')) {
    return AssetImage(trimmed);
  }
  return NetworkImage(trimmed);
}

String _photoPreview(
  String name,
  String ordinalLabel,
  PhotoPromptAnswer? prompt,
) {
  final photoPrompt = prompt?.displayPrompt.trim();
  if (photoPrompt != null && photoPrompt.isNotEmpty) return photoPrompt;
  return "$name's $ordinalLabel";
}

String _runningPreview(RunningPreferences running) {
  final reasons = running.runningReasons
      .map((reason) => reason.label)
      .join(' · ');
  final times = running.preferredRunTimes.map((time) => time.label).join(' · ');
  return [
    'Pace ${formatPaceRange(running.paceMinSecsPerKm, running.paceMaxSecsPerKm)}',
    'Distance ${_distanceSummary(running)}',
    if (reasons.isNotEmpty) reasons,
    if (times.isNotEmpty) times,
  ].join(' · ');
}

String _distanceSummary(RunningPreferences running) {
  if (running.preferredDistances.isEmpty) return 'Any event';
  return running.preferredDistances.map((d) => d.label).take(2).join(', ');
}

String _truncatePreview(String value) {
  const maxPreviewLength = 180;
  final trimmed = value.trim();
  if (trimmed.length <= maxPreviewLength) return trimmed;
  return '${trimmed.substring(0, maxPreviewLength - 1)}…';
}
