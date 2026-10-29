import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter/widgets.dart';

/// Presentation model for the flagship profile surface ([ProfileBody]).
///
/// Pure and fixture-friendly so the surface can be golden-tested without a real
/// `PublicProfile`. The real data is mapped on at integration time via
/// `profileViewFromCardContent` (see `profile_view_mapper.dart`).
///
/// A profile is a dark "wow" hero plus an ordered list of [ProfileSectionData]s.
/// Every section that the Catches flow lets you react to carries a
/// [ProfileReactionTarget]; in read-only modes (preview / public profile) the
/// surface is handed a null `onReact` and the reaction affordances disappear.
@immutable
class ProfileView {
  const ProfileView({
    required this.name,
    required this.age,
    this.heroPhoto,
    this.heroReaction,
    this.kicker,
    this.kickerActivity,
    this.metaLine,
    this.sections = const <ProfileSectionData>[],
  });

  final String name;
  final int age;

  /// Hero image; null renders the on-brand activity-art fallback.
  final ImageProvider<Object>? heroPhoto;

  /// Reaction target for the hero photo (Catches only).
  final ProfileReactionTarget? heroReaction;

  /// Small mono eyebrow over the name, e.g. `WAS AT · SUNDOWNER 5K`.
  final String? kicker;

  /// If set, the kicker + Like adopt this activity's pigment (color = meaning).
  final ActivityKind? kickerActivity;

  /// Mono meta strip under the name, e.g. `DESIGNER · BANDRA · 2 MUTUAL CLUBS`.
  final String? metaLine;

  /// Ordered body sections (compatibility, prompts, running, photos, details…).
  final List<ProfileSectionData> sections;
}

/// One body block. [reaction] is non-null only where the Catches flow allows a
/// like/comment; the surface renders [ProfileReactionAction] for it when the
/// surface itself is reactable (`onReact != null`).
@immutable
sealed class ProfileSectionData {
  const ProfileSectionData({this.reaction});
  final ProfileReactionTarget? reaction;
}

/// "Why you might click" — compatibility reasons + confidence signals.
class ProfileCompatibilitySectionData extends ProfileSectionData {
  const ProfileCompatibilitySectionData({
    required this.title,
    required this.reasons,
    this.confidence = const <String>[],
    super.reaction,
  });

  final String title;
  final List<String> reasons;
  final List<String> confidence;
}

/// A prompt: tracked-mono question + Archivo answer.
class ProfilePromptSectionData extends ProfileSectionData {
  const ProfilePromptSectionData({
    required this.question,
    required this.answer,
    super.reaction,
  });

  final String question;
  final String answer;
}

/// Running identity: pace + distance headline, with reasons / times / tags.
class ProfileRunningSectionData extends ProfileSectionData {
  const ProfileRunningSectionData({
    required this.pace,
    required this.distance,
    this.reasons = const <String>[],
    this.times = const <String>[],
    this.tags = const <String>[],
    super.reaction,
  });

  final String pace;
  final String distance;
  final List<String> reasons;
  final List<String> times;
  final List<String> tags;
}

/// A standalone profile photo (graded), optionally with its photo prompt caption.
class ProfilePhotoSectionData extends ProfileSectionData {
  const ProfilePhotoSectionData({
    required this.image,
    this.caption,
    super.reaction,
  });

  final ImageProvider<Object>? image;
  final String? caption;
}

/// A titled group of icon + text facts (details, lifestyle).
class ProfileFactsSectionData extends ProfileSectionData {
  const ProfileFactsSectionData({
    required this.title,
    required this.facts,
    super.reaction,
  });

  final String title;
  final List<ProfileFact> facts;
}

@immutable
class ProfileFact {
  const ProfileFact({required this.icon, required this.text});
  final IconData icon;
  final String text;
}
