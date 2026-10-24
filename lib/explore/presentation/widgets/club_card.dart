import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/shared/club_cover.dart';
import 'package:catch_dating_app/clubs/shared/club_host_identity_row.dart';
import 'package:catch_dating_app/clubs/shared/club_placeholder_cover.dart';
import 'package:catch_dating_app/clubs/shared/club_transition_tags.dart';
import 'package:catch_dating_app/explore/presentation/explore_club_display_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/organizers.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ClubCard extends StatelessWidget {
  const ClubCard({super.key, required this.club, this.onClubSelected});

  final Club club;
  final ValueChanged<Club>? onClubSelected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final state = ExploreClubCardState.from(club, l10n: context.l10n);
    final onTap = onClubSelected == null ? null : () => onClubSelected!(club);
    final card = CatchPoster(
      onTap: onTap,
      media: ClubCover(club: club),
      mediaOverlay: Stack(
        children: [
          Positioned(
            top: CatchSpacing.s3,
            left: CatchSpacing.s3,
            child: OrganizerAuthorityBadge(
              state: club.organizerAuthority.trustState,
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
            ClubHostIdentityRow(
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
            ExploreClubTagList(state: state),
          ],
        ],
      ),
    );
    final content = Hero(
      tag: clubInteractionHeroTag(club.id),
      transitionOnUserGestures: true,
      child: Material(color: Colors.transparent, child: card),
    );
    return Semantics(
      key: ValueKey<String>('explore-organizer-${club.id}'),
      container: true,
      button: onTap != null,
      label: state.semanticLabel,
      onTap: onTap,
      child: ExcludeSemantics(child: content),
    );
  }
}

class ExploreFeedClubRow extends StatelessWidget {
  const ExploreFeedClubRow({
    super.key,
    required this.club,
    this.onClubSelected,
  });

  final Club club;
  final ValueChanged<Club>? onClubSelected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final palette = ClubCoverVisualPalette.forClub(context, club);
    final state = ExploreClubCardState.from(club, l10n: context.l10n);
    final onTap = onClubSelected == null ? null : () => onClubSelected!(club);
    final card = CatchSurface.card(
      key: ValueKey<String>('explore-club-row-${club.id}'),
      onTap: onTap,
      borderRole: CatchBorderRole.boundary,
      padding: CatchInsets.content,
      child: Row(
        children: [
          SizedBox.square(
            // Fixed compact cover thumbnail (not scaling media). A bounded box
            // gives the cover determinate constraints — an AspectRatio here gets
            // unbounded width (Row) and height (SliverList) and cannot lay out.
            dimension: CatchLayout.clubCoverThumbnailExtent,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(
                CatchLayout.clubCoverCompactMediaRadius,
              ),
              child: ClubCover(club: club, compact: true),
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
                Text(
                  state.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: CatchTextStyles.clubDisplay(
                    context,
                    step: CatchTextStylesSize.m,
                  ),
                ),
                gapH4,
                OrganizerAuthorityBadge(
                  state: club.organizerAuthority.trustState,
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
          Icon(CatchIcons.forwardArrow, size: CatchIcon.md, color: t.ink3),
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

class ExploreClubTagList extends StatelessWidget {
  const ExploreClubTagList({super.key, required this.state});

  final ExploreClubCardState state;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    if (state.tags.isEmpty) {
      return CatchMetadataText(
        state.memberCountLabel.toUpperCase(),
        color: t.ink3,
      );
    }
    return ClubTagList(tags: state.tags);
  }
}
