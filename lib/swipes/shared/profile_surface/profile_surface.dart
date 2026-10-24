import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_card_content.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_reaction_action.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view_mapper.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum ProfileSurfaceMode { catches, preview, publicProfile }

/// The single shared profile shell. Renders the flagship [ProfileBody] for
/// all three modes; only [ProfileSurfaceMode.catches] is reactable (per-section
/// like + comment), so preview / public profile read calm and affordance-free.
class ProfileSurface extends StatelessWidget {
  const ProfileSurface({
    super.key,
    required this.profile,
    this.mode = ProfileSurfaceMode.preview,
    this.scrollController,
    this.scrollPhysics,
    this.onLeadingOverscroll,
    this.bottomPadding = CatchSpacing.s6,
    this.includeTerminalPadding = false,
    this.onReact,
    this.viewerProfile,
    this.sharedRunTitle,
    this.reactionsEnabled = true,
    this.reactionsPending = false,
  });

  final PublicProfile profile;
  final ProfileSurfaceMode mode;
  final ScrollController? scrollController;
  final ScrollPhysics? scrollPhysics;
  final ValueChanged<double>? onLeadingOverscroll;
  final double bottomPadding;
  final bool includeTerminalPadding;
  final ProfileReactionCallback? onReact;
  final UserProfile? viewerProfile;
  final String? sharedRunTitle;
  final bool reactionsEnabled;
  final bool reactionsPending;

  @override
  Widget build(BuildContext context) {
    final effectiveOnReact = mode == ProfileSurfaceMode.catches
        ? onReact
        : null;

    final content = ProfileCardContent.fromProfile(
      profile,
      l10n: context.l10n,
      viewerProfile: viewerProfile,
      sharedRunTitle: sharedRunTitle,
    );
    final view = profileViewFromCardContent(
      content,
      l10n: context.l10n,
      name: profile.name,
      age: profile.age,
      running: profile.activityPreferences.running,
      kicker: _kicker(sharedRunTitle),
      kickerActivity: ActivityKind.socialRun,
      metaLine: _metaLine(profile),
    );

    return Semantics(
      label: context.l10n.swipesProfileSurfaceLabelProfileOfNameAge(
        name: profile.name,
        age: profile.age,
      ),
      hint: _semanticHint(mode),
      child: ProfileBody(
        data: view,
        onReact: effectiveOnReact,
        scrollController: scrollController,
        scrollPhysics: scrollPhysics,
        onLeadingOverscroll: onLeadingOverscroll,
        bottomPadding: bottomPadding,
        includeTerminalPadding: includeTerminalPadding,
        reactionsEnabled: reactionsEnabled,
        reactionsPending: reactionsPending,
      ),
    );
  }
}

/// Content-shaped placeholder for the shared public/preview profile surface.
class ProfileSurfaceSkeleton extends StatelessWidget {
  const ProfileSurfaceSkeleton({
    super.key,
    this.scrollController,
    this.scrollPhysics,
    this.onLeadingOverscroll,
    this.bottomPadding = CatchSpacing.s6,
    this.includeTerminalPadding = false,
  });

  static const scrollViewKey = ValueKey<String>('profile.surface.skeleton');

  final ScrollController? scrollController;
  final ScrollPhysics? scrollPhysics;
  final ValueChanged<double>? onLeadingOverscroll;
  final double bottomPadding;
  final bool includeTerminalPadding;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

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
            const SliverToBoxAdapter(child: ProfileSurfaceHeroSkeleton()),
            SliverPadding(
              padding: CatchInsets.pageBody.copyWith(
                top: CatchSpacing.s7,
                bottom: bottomPadding,
              ),
              sliver: SliverList.list(
                children: const [
                  ProfileSurfaceSectionSkeleton(lines: 3),
                  ProfileSurfaceDivider(),
                  ProfileSurfaceRunningSkeleton(),
                  ProfileSurfaceDivider(),
                  ProfileSurfacePhotoSkeleton(),
                  ProfileSurfaceDivider(),
                  ProfileSurfaceFactsSkeleton(),
                ],
              ),
            ),
            if (includeTerminalPadding) const CatchScrollTerminalGap.sliver(),
          ],
        ),
      ),
    );
  }
}

class ProfileSurfaceHeroSkeleton extends StatelessWidget {
  const ProfileSurfaceHeroSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Padding(
      padding: CatchInsets.pageHorizontal.copyWith(top: CatchSpacing.s3),
      child: CatchSurface(
        borderRole: CatchBorderRole.separator,
        radius: CatchLayout.personPolaroidRadius,
        emphasis: CatchSurfaceEmphasis.subtle,
        backgroundColor: t.surface,
        padding: CatchInsets.contentDense,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: CatchAspectRatio.portrait4x5,
              child: CatchSkeleton.box(
                width: double.infinity,
                height: double.infinity,
                borderRadius: BorderRadius.circular(
                  CatchLayout.personPolaroidMediaRadius,
                ),
              ),
            ),
            gapH10,
            CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
            gapH6,
            CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
            gapH6,
            CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
          ],
        ),
      ),
    );
  }
}

class ProfileSurfaceSectionSkeleton extends StatelessWidget {
  const ProfileSurfaceSectionSkeleton({super.key, required this.lines});

  final int lines;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentVertical,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
          gapH10,
          CatchSkeleton.textBlock(lines: lines),
          gapH10,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (var index = 0; index < 3; index++)
                CatchSkeleton.box(
                  width: CatchLayout.skeletonTextShortWidth,
                  height: CatchLayout.countPillIconSize,
                  radius: CatchRadius.pill,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfileSurfaceRunningSkeleton extends StatelessWidget {
  const ProfileSurfaceRunningSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentVertical,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
          gapH10,
          Row(
            children: [
              Expanded(
                child: CatchSkeleton.card(
                  height: CatchLayout.skeletonCardCompactHeight,
                ),
              ),
              gapW12,
              Expanded(
                child: CatchSkeleton.card(
                  height: CatchLayout.skeletonCardCompactHeight,
                ),
              ),
            ],
          ),
          gapH10,
          CatchSkeleton.text(),
        ],
      ),
    );
  }
}

class ProfileSurfacePhotoSkeleton extends StatelessWidget {
  const ProfileSurfacePhotoSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentVertical,
      child: CatchSurface(
        duration: Duration.zero,
        tone: CatchSurfaceTone.transparent,
        clipBehavior: Clip.antiAlias,
        child: AspectRatio(
          aspectRatio: CatchAspectRatio.portrait4x5,
          child: CatchSkeleton.box(
            width: double.infinity,
            height: double.infinity,
            borderRadius: BorderRadius.zero,
          ),
        ),
      ),
    );
  }
}

class ProfileSurfaceFactsSkeleton extends StatelessWidget {
  const ProfileSurfaceFactsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentVertical,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
          gapH10,
          for (var index = 0; index < 4; index++) ...[
            Row(
              children: [
                CatchSkeleton.box(
                  width: CatchIcon.control,
                  height: CatchIcon.control,
                  radius: CatchRadius.pill,
                ),
                gapW12,
                Expanded(child: CatchSkeleton.text()),
              ],
            ),
            if (index < 3) gapH12,
          ],
        ],
      ),
    );
  }
}

class ProfileSurfaceDivider extends StatelessWidget {
  const ProfileSurfaceDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: CatchInsets.contentVertical,
      child: CatchDivider.section(),
    );
  }
}

String? _kicker(String? sharedRunTitle) {
  final title = sharedRunTitle?.trim();
  if (title == null || title.isEmpty) return null;
  return 'Was at · $title';
}

String? _metaLine(PublicProfile profile) {
  final parts = <String>[
    ?_trimToNull(profile.occupation),
    ?_trimToNull(cityLabel(profile.city)),
  ];
  return parts.isEmpty ? null : parts.join(' · ');
}

String? _trimToNull(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  return trimmed;
}

String _semanticHint(ProfileSurfaceMode mode) {
  return switch (mode) {
    ProfileSurfaceMode.catches =>
      'Scroll to read the full profile. Like or comment on a section, or pass with the floating close button.',
    ProfileSurfaceMode.preview =>
      'Preview how your profile appears to other runners. Scroll to read the full profile.',
    ProfileSurfaceMode.publicProfile =>
      'Scroll to read the full public profile.',
  };
}
