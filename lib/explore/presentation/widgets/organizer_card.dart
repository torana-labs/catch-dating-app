// architecture: provider-free
import 'package:catch_dating_app/explore/presentation/explore_organizer_display_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/organizers.dart';
import 'package:catch_dating_app/organizers/shared/organizer_cover.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class OrganizerCard extends StatelessWidget {
  const OrganizerCard({
    super.key,
    required this.organizer,
    this.onOrganizerSelected,
  });

  final Organizer organizer;
  final ValueChanged<Organizer>? onOrganizerSelected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final state = ExploreOrganizerCardState.from(organizer, l10n: context.l10n);
    final onTap = onOrganizerSelected == null
        ? null
        : () => onOrganizerSelected!(organizer);
    final card = CatchPoster(
      onTap: onTap,
      media: OrganizerCover(organizer: organizer),
      mediaOverlay: Stack(
        children: [
          Positioned(
            top: CatchSpacing.s3,
            left: CatchSpacing.s3,
            child: OrganizerAuthorityBadge(
              state: organizer.organizerAuthority.trustState,
            ),
          ),
          Positioned(
            top: CatchSpacing.s3,
            right: CatchSpacing.s3,
            child: CatchBadge.solid(label: state.memberCountLabel),
          ),
        ],
      ),
      kicker: state.caption,
      title: state.title,
      tagline: state.supportingLabel,
      showArrow: onTap != null,
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (state.hasHostIdentity)
            OrganizerHostIdentityRow(
              hostName: state.hostName,
              hostAvatarUrl: state.hostAvatarUrl,
              eyebrow: state.hostEyebrow,
              avatarSize: 24,
              trailing: CatchMetadataText(
                state.ratingReviewLabel,
                color: t.ink3,
              ),
            )
          else
            CatchMetadataText(state.ratingReviewLabel, color: t.ink3),
          if (state.tags.isNotEmpty) ...[
            gapH8,
            ExploreOrganizerTagList(state: state),
          ],
        ],
      ),
    );
    final content = CatchHeroViewport(
      tag: organizerInteractionHeroTag(organizer.id),
      child: card,
    );
    return Semantics(
      key: ValueKey<String>('explore-organizer-${organizer.id}'),
      container: true,
      button: onTap != null,
      label: state.semanticLabel,
      onTap: onTap,
      child: ExcludeSemantics(child: content),
    );
  }
}

class ExploreFeedOrganizerRow extends StatelessWidget {
  const ExploreFeedOrganizerRow({
    super.key,
    required this.organizer,
    this.onOrganizerSelected,
  });

  final Organizer organizer;
  final ValueChanged<Organizer>? onOrganizerSelected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final palette = OrganizerCoverVisualPalette.forOrganizer(
      context,
      organizer,
    );
    final state = ExploreOrganizerCardState.from(organizer, l10n: context.l10n);
    final onTap = onOrganizerSelected == null
        ? null
        : () => onOrganizerSelected!(organizer);
    final card = CatchSurface.card(
      key: ValueKey<String>('explore-club-row-${organizer.id}'),
      onTap: onTap,
      borderRole: CatchBorderRole.boundary,
      padding: CatchInsets.content,
      child: Row(
        children: [
          SizedBox.square(
            // Fixed compact cover thumbnail (not scaling media). A bounded box
            // gives the cover determinate constraints — an AspectRatio here gets
            // unbounded width (Row) and height (SliverList) and cannot lay out.
            dimension: CatchLayout.organizerCoverThumbnailExtent,
            child: CatchSurface(
              duration: Duration.zero,
              tone: CatchSurfaceTone.transparent,
              radius: CatchLayout.organizerCoverCompactMediaRadius,
              clipBehavior: Clip.antiAlias,
              child: OrganizerCover(organizer: organizer, compact: true),
            ),
          ),
          gapW14,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchMetadataText(state.rowKicker, color: palette.accent),
                gapH4,
                CatchText(
                  state.title,
                  variant: CatchTextVariant.displayXs,
                  maxLines: 2,
                ),
                gapH4,
                OrganizerAuthorityBadge(
                  state: organizer.organizerAuthority.trustState,
                ),
                gapH4,
                CatchText(
                  state.supportingLabel,
                  maxLines: 1,

                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
                gapH4,
                CatchMetadataText(state.ratingReviewLabel, color: t.ink3),
              ],
            ),
          ),
          gapW12,
          Icon(CatchIcons.forward, size: CatchIconSize.md, color: t.ink3),
        ],
      ),
    );
    return Semantics(
      container: true,
      button: onTap != null,
      label: state.semanticLabel,
      onTap: onTap,
      child: ExcludeSemantics(child: card),
    );
  }
}

class ExploreOrganizerTagList extends StatelessWidget {
  const ExploreOrganizerTagList({super.key, required this.state});

  final ExploreOrganizerCardState state;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    if (state.tags.isEmpty) {
      return CatchMetadataText(
        state.memberCountLabel.toUpperCase(),
        color: t.ink3,
      );
    }
    return OrganizerTagList(tags: state.tags);
  }
}
