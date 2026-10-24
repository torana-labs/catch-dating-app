import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_backdrop_image.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_reaction_action.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// PHASE 2 — the flagship profile surface, in the locked editorial language:
/// a person-polaroid hero on a graded photo, Archivo voice, IBM Plex Mono data,
/// bodyL reading text, hairlines over boxes. Color = activity (the kicker +
/// reaction affordances borrow the meeting activity's pigment).
///
/// Pure presentation over a [ProfileView]; real data is mapped on via
/// `profileViewFromCardContent`. When [onReact] is non-null (the Catches flow)
/// every reactable section shows like + comment controls; in read-only modes
/// (profile preview, public profile) it is null and the surface is calm.
class ProfileBody extends StatelessWidget {
  const ProfileBody({
    super.key,
    required this.data,
    this.onReact,
    this.scrollController,
    this.scrollPhysics,
    this.onLeadingOverscroll,
    this.bottomPadding = CatchSpacing.s12,
    this.includeTerminalPadding = false,
    this.reactionsEnabled = true,
    this.reactionsPending = false,
  });

  static const scrollViewKey = ValueKey<String>('profile.surface.scroll');

  final ProfileView data;

  /// Non-null only in Catches: enables per-section like + comment.
  final ProfileReactionCallback? onReact;

  final ScrollController? scrollController;
  final ScrollPhysics? scrollPhysics;
  final ValueChanged<double>? onLeadingOverscroll;
  final double bottomPadding;
  final bool includeTerminalPadding;
  final bool reactionsEnabled;
  final bool reactionsPending;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = data.kickerActivity == null
        ? null
        : ActivityPalette.resolve(context, data.kickerActivity!);

    return ColoredBox(
      color: t.bg,
      child: NotificationListener<OverscrollNotification>(
        onNotification: (notification) {
          if (notification.depth == 0 &&
              notification.overscroll < 0 &&
              notification.metrics.pixels <=
                  notification.metrics.minScrollExtent) {
            onLeadingOverscroll?.call(notification.overscroll);
          }
          return false;
        },
        child: CustomScrollView(
          key: scrollViewKey,
          controller: scrollController,
          physics: scrollPhysics,
          slivers: [
            SliverToBoxAdapter(
              child: ProfileHeader(
                data: data,
                accent: activity?.accent,
                onReact: onReact,
                reactionsEnabled: reactionsEnabled,
                reactionsPending: reactionsPending,
              ),
            ),
            SliverPadding(
              padding: CatchInsets.pageBody.copyWith(
                top: CatchSpacing.s7,
                bottom: bottomPadding,
              ),
              sliver: SliverList.list(children: _body(context, activity)),
            ),
            if (includeTerminalPadding) const CatchScrollTerminalGap.sliver(),
          ],
        ),
      ),
    );
  }

  List<Widget> _body(BuildContext context, ActivityStyle? activity) {
    final t = CatchTokens.of(context);
    final blocks = <Widget>[];
    for (var i = 0; i < data.sections.length; i++) {
      if (i > 0) blocks.add(ProfileDivider(color: t.line));
      blocks.add(
        ProfileSection(
          section: data.sections[i],
          activity: activity,
          onReact: onReact,
          reactionsEnabled: reactionsEnabled,
          reactionsPending: reactionsPending,
        ),
      );
    }
    return [
      for (final block in blocks)
        Padding(padding: CatchInsets.contentVertical, child: block),
    ];
  }
}

// ── Hero (person-polaroid surface) ────────────────────────────────────────────

class ProfileHeader extends StatelessWidget {
  const ProfileHeader({
    super.key,
    required this.data,
    this.accent,
    this.onReact,
    this.reactionsEnabled = true,
    this.reactionsPending = false,
  });

  final ProfileView data;
  final Color? accent;
  final ProfileReactionCallback? onReact;
  final bool reactionsEnabled;
  final bool reactionsPending;

  @override
  Widget build(BuildContext context) {
    final reaction = data.heroReaction;

    return Padding(
      padding: CatchInsets.pageHorizontal.copyWith(top: CatchSpacing.s3),
      child: CatchPolaroid(
        media: ProfilePhoto(
          image: data.heroPhoto,
          activity: data.kickerActivity,
        ),
        mediaOverlay: onReact != null && reaction != null
            ? Stack(
                children: [
                  Positioned(
                    top: CatchSpacing.s3,
                    right: CatchSpacing.s3,
                    child: ProfileReactionAction(
                      target: reaction,
                      onReact: onReact!,
                      style: ProfileReactionActionVariant.overlay,
                      enabled: reactionsEnabled,
                      isPending: reactionsPending,
                    ),
                  ),
                ],
              )
            : null,
        kicker: data.kicker,
        accentColor: accent,
        name: context.l10n.swipesCatchProfileViewTextNameAge(
          name: data.name,
          age: data.age,
        ),
        meta: data.metaLine,
      ),
    );
  }
}

/// Real photo (graded at display time) or the activity-art fallback when absent.
class ProfilePhoto extends StatelessWidget {
  const ProfilePhoto({super.key, required this.image, this.activity});

  final ImageProvider<Object>? image;
  final ActivityKind? activity;

  @override
  Widget build(BuildContext context) {
    final photo = image;
    if (photo == null) {
      return EventBackdropImage(
        visual: eventActivityVisual(
          activity ?? ActivityKind.openActivity,
          context: context,
        ),
        dense: true,
        iconSize: CatchLayout.profileFallbackArtworkIconSize,
        iconOpacity: CatchOpacity.profileFallbackArtworkIcon,
        patternOpacity: CatchOpacity.profileFallbackArtworkPattern,
      );
    }
    return CatchGradedImage(
      child: Image(image: photo, fit: BoxFit.cover),
    );
  }
}

// ── Section dispatch (content + optional reaction controls) ───────────────────

class ProfileSection extends StatelessWidget {
  const ProfileSection({
    super.key,
    required this.section,
    this.activity,
    this.onReact,
    this.reactionsEnabled = true,
    this.reactionsPending = false,
  });

  final ProfileSectionData section;
  final ActivityStyle? activity;
  final ProfileReactionCallback? onReact;
  final bool reactionsEnabled;
  final bool reactionsPending;

  @override
  Widget build(BuildContext context) {
    // Photo sections embed their own overlay reaction control over the image.
    if (section case final ProfilePhotoSectionData photo) {
      return ProfilePhotoSection(
        section: photo,
        onReact: onReact,
        reactionsEnabled: reactionsEnabled,
        reactionsPending: reactionsPending,
      );
    }

    final content = switch (section) {
      ProfileCompatibilitySectionData s => ProfileCompatibilitySection(
        section: s,
        activity: activity,
      ),
      ProfilePromptSectionData s => ProfilePromptSection(section: s),
      ProfileRunningSectionData s => ProfileRunningSection(
        section: s,
        activity: activity,
      ),
      ProfileFactsSectionData s => ProfileFactsSection(section: s),
      ProfilePhotoSectionData() => const SizedBox.shrink(),
    };

    final reaction = section.reaction;
    if (onReact == null || reaction == null) return content;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        content,
        gapH3,
        Align(
          alignment: Alignment.centerLeft,
          child: ProfileReactionAction(
            target: reaction,
            onReact: onReact!,
            enabled: reactionsEnabled,
            isPending: reactionsPending,
          ),
        ),
      ],
    );
  }
}

class ProfileKickerText extends StatelessWidget {
  const ProfileKickerText(this.label, {super.key, this.color});

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Text(
      label.toUpperCase(),
      style: CatchTextStyles.kicker(context, color: color ?? t.ink3),
    );
  }
}

// ── Compatibility ("Why you might click") ─────────────────────────────────────

class ProfileCompatibilitySection extends StatelessWidget {
  const ProfileCompatibilitySection({
    super.key,
    required this.section,
    this.activity,
  });

  final ProfileCompatibilitySectionData section;
  final ActivityStyle? activity;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final markColor = activity?.accent ?? t.ink;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProfileKickerText(section.title),
        gapH10,
        for (final (index, reason) in section.reasons.indexed) ...[
          if (index > 0) ProfileDivider(color: t.line),
          Padding(
            padding: EdgeInsets.only(
              top: index > 0 ? CatchSpacing.s3 : 0,
              bottom: index == section.reasons.length - 1 ? 0 : CatchSpacing.s3,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: CatchSpacing.s1),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: markColor,
                      borderRadius: BorderRadius.circular(CatchRadius.pill),
                    ),
                    child: const SizedBox.square(
                      dimension: CatchSpacing.micro6,
                    ),
                  ),
                ),
                gapW12,
                Expanded(
                  child: Text(
                    reason,
                    style: CatchTextStyles.hint(context, color: t.ink),
                  ),
                ),
              ],
            ),
          ),
        ],
        if (section.confidence.isNotEmpty) ...[
          gapH10,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (final signal in section.confidence)
                CatchChip.tag(label: signal),
            ],
          ),
        ],
      ],
    );
  }
}

// ── Prompt (mono question + Archivo answer) ───────────────────────────────────

class ProfilePromptSection extends StatelessWidget {
  const ProfilePromptSection({super.key, required this.section});

  final ProfilePromptSectionData section;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProfileKickerText(section.question),
        gapH8,
        CatchText(
          section.answer,
          variant: CatchTextVariant.sectionTitle,
          color: t.ink,
        ),
      ],
    );
  }
}

// ── Running identity ──────────────────────────────────────────────────────────

class ProfileRunningSection extends StatelessWidget {
  const ProfileRunningSection({
    super.key,
    required this.section,
    this.activity,
  });

  final ProfileRunningSectionData section;
  final ActivityStyle? activity;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProfileKickerText(
          context.l10n.swipesCatchProfileViewVisiblecopyRunningRhythm,
          color: activity?.accent,
        ),
        gapH10,
        CatchMetricSection(
          items: [
            CatchMetricValue(
              value: section.pace,
              label: context.l10n.swipesCatchProfileViewLabelPace,
            ),
            CatchMetricValue(
              value: section.distance,
              label: context.l10n.swipesCatchProfileViewLabelDistance,
            ),
          ],
        ),
        if (section.reasons.isNotEmpty || section.times.isNotEmpty) ...[
          gapH10,
          CatchText(
            [...section.reasons, ...section.times].join('  ·  '),
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
        ],
        if (section.tags.isNotEmpty) ...[
          gapH10,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (final tag in section.tags)
                CatchChip.tag(
                  label: tag,
                  tintColor: activity?.soft,
                  inkColor: activity?.deep,
                ),
            ],
          ),
        ],
      ],
    );
  }
}

// ── Facts (details / lifestyle: icon + text rows) ─────────────────────────────

class ProfileFactsSection extends StatelessWidget {
  const ProfileFactsSection({super.key, required this.section});

  final ProfileFactsSectionData section;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProfileKickerText(section.title),
        gapH10,
        for (final fact in section.facts)
          Padding(
            padding: const EdgeInsets.only(bottom: CatchSpacing.s2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: CatchSpacing.micro2),
                  child: Icon(
                    fact.icon,
                    size: CatchIcon.control,
                    color: t.ink3,
                  ),
                ),
                gapW12,
                Expanded(
                  child: CatchText(
                    fact.text,
                    variant: CatchTextVariant.bodyL,
                    color: t.ink,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ── Standalone photo (graded) + overlay reaction control ──────────────────────

class ProfilePhotoSection extends StatelessWidget {
  const ProfilePhotoSection({
    super.key,
    required this.section,
    this.onReact,
    this.reactionsEnabled = true,
    this.reactionsPending = false,
  });

  final ProfilePhotoSectionData section;
  final ProfileReactionCallback? onReact;
  final bool reactionsEnabled;
  final bool reactionsPending;

  @override
  Widget build(BuildContext context) {
    final reaction = section.reaction;
    return ClipRRect(
      borderRadius: BorderRadius.circular(CatchRadius.lg),
      child: AspectRatio(
        aspectRatio: CatchAspectRatio.portrait4x5,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ProfilePhoto(image: section.image),
            if (section.caption != null && section.caption!.trim().isNotEmpty)
              Positioned(
                left: CatchSpacing.s4,
                right: CatchSpacing.s4,
                bottom: CatchSpacing.s4,
                child: ProfileCaptionText(text: section.caption!),
              ),
            if (onReact != null && reaction != null)
              Positioned(
                top: CatchSpacing.s3,
                right: CatchSpacing.s3,
                child: ProfileReactionAction(
                  target: reaction,
                  onReact: onReact!,
                  style: ProfileReactionActionVariant.overlay,
                  enabled: reactionsEnabled,
                  isPending: reactionsPending,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class ProfileCaptionText extends StatelessWidget {
  const ProfileCaptionText({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final dark = CatchTokens.editorialDark;
    return CatchSurface(
      padding: CatchInsets.compactControlContent,
      radius: CatchRadius.sm,
      backgroundColor: dark.darkScrimFill,
      child: CatchText(text, variant: CatchTextVariant.bodyM, color: dark.ink),
    );
  }
}

// ── Shared bits ───────────────────────────────────────────────────────────────

class ProfileDivider extends StatelessWidget {
  const ProfileDivider({super.key, required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: CatchStroke.hairline,
      child: ColoredBox(color: color),
    );
  }
}
