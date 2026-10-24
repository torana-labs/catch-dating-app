import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen_state.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_contact_section.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_formatters.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_hero_top_bar.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_host_section.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_photo_rail.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_schedule_section.dart';
import 'package:catch_dating_app/clubs/shared/club_host_identity_row.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/organizers.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef ClubEventSelectionHandler = void Function(Event event);

enum ClubDetailPresentationMode { route, embeddedReadOnlyPreview }

const EdgeInsets _clubActivityTilePadding = EdgeInsets.symmetric(
  horizontal: CatchSpacing.s4,
  vertical: CatchSpacing.s3,
);

class ClubDetailBody extends StatelessWidget {
  const ClubDetailBody({
    super.key,
    required this.state,
    this.onShareClub,
    this.onEventSelected,
    this.onViewHostProfile,
    this.onMessageHost,
    this.onContactSelected,
    this.presentationMode = ClubDetailPresentationMode.route,
  });

  final ClubDetailBodyState state;
  final ClubShareHandler? onShareClub;
  final ClubEventSelectionHandler? onEventSelected;
  final ClubHostProfileHandler? onViewHostProfile;
  final ClubHostMessageHandler? onMessageHost;
  final ClubContactActionHandler? onContactSelected;
  final ClubDetailPresentationMode presentationMode;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return ColoredBox(
      color: t.bg,
      child: CustomScrollView(
        slivers: [
          ClubDetailSliverBody(
            state: state,
            onShareClub: onShareClub,
            onEventSelected: onEventSelected,
            onViewHostProfile: onViewHostProfile,
            onMessageHost: onMessageHost,
            onContactSelected: onContactSelected,
            presentationMode: presentationMode,
          ),
        ],
      ),
    );
  }
}

/// Sliver-native form of the canonical Club Detail composition.
///
/// Consumer routes and embedded owner previews use this same renderer; only
/// route chrome and interaction callbacks differ.
class ClubDetailSliverBody extends StatelessWidget {
  const ClubDetailSliverBody({
    super.key,
    required this.state,
    this.onShareClub,
    this.onEventSelected,
    this.onViewHostProfile,
    this.onMessageHost,
    this.onContactSelected,
    this.presentationMode = ClubDetailPresentationMode.route,
  });

  final ClubDetailBodyState state;
  final ClubShareHandler? onShareClub;
  final ClubEventSelectionHandler? onEventSelected;
  final ClubHostProfileHandler? onViewHostProfile;
  final ClubHostMessageHandler? onMessageHost;
  final ClubContactActionHandler? onContactSelected;
  final ClubDetailPresentationMode presentationMode;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final club = state.club;
    final tags = visibleClubTags(club, limit: 6);
    final nextEvent = state.nextEvent;
    final showTrailingSections =
        state.showReviews || state.contactActions.isNotEmpty;
    final embeddedPreview =
        presentationMode == ClubDetailPresentationMode.embeddedReadOnlyPreview;
    final effectiveEventSelection = embeddedPreview ? null : onEventSelected;
    final effectiveHostProfileSelection = embeddedPreview
        ? null
        : onViewHostProfile;
    final effectiveHostMessage = embeddedPreview ? null : onMessageHost;
    final effectiveContactSelection = embeddedPreview
        ? null
        : onContactSelected;

    return SliverMainAxisGroup(
      slivers: [
        ClubHeroTopBar(
          club: club,
          isHost: state.isHost,
          locationLabel: _clubHeroLocationLabel(club, nextEvent),
          onShareClub: embeddedPreview ? null : onShareClub,
          presentationMode: embeddedPreview
              ? ClubHeroPresentationMode.embeddedReadOnlyPreview
              : ClubHeroPresentationMode.route,
        ),
        CatchSectionList.sliver(
          emptyStateOmitted: true,
          gap: CatchSpacing.screenPt,
          bottomPadding: 0,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (nextEvent != null) ...[
                  ClubNextRunBanner(
                    event: nextEvent,
                    onTap: effectiveEventSelection == null
                        ? null
                        : () => effectiveEventSelection(nextEvent),
                  ),
                  gapH16,
                ],
                Align(
                  alignment: Alignment.centerLeft,
                  child: OrganizerAuthorityBadge(
                    state: club.organizerAuthority.trustState,
                  ),
                ),
                gapH12,
                CatchMetricSection.grid(
                  items: _clubMetricItems(club, context.l10n),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchSection.divided(
                  title: context.l10n.clubsClubDetailBodyTitleAbout,
                  first: true,
                  child: CatchText(
                    club.description,
                    variant: CatchTextVariant.bodyL,
                    color: t.ink,
                  ),
                ),
                if (tags.isNotEmpty)
                  CatchSection.divided(
                    title: context.l10n.clubsClubDetailBodyTitleWhatWeDo,
                    child: ClubActivitySection(club: club, tags: tags),
                  ),
                if (club.clubPhotos.isNotEmpty)
                  CatchSection.divided(
                    title: context.l10n.clubsClubDetailBodyTitleFromTheClub,
                    child: ClubPhotoRail(club: club),
                  ),
                if (club.displayHostProfiles.isNotEmpty)
                  CatchSection.divided(
                    title: context.l10n.clubsClubDetailBodyTitleYourHosts,
                    count: club.displayHostProfiles.length,
                    child: ClubHostSection(
                      club: club,
                      canViewProfile:
                          state.isAuthenticated &&
                          effectiveHostProfileSelection != null,
                      isMessageHostPending: state.isMessageHostPending,
                      messageableHostUids: state.messageableHostUids,
                      onViewProfile: effectiveHostProfileSelection,
                      onMessageHost: effectiveHostMessage,
                    ),
                  ),
              ],
            ),
          ],
        ),
        ClubScheduleSection(
          events: state.upcomingEvents,
          isHost: state.isHost,
          onEventSelected: effectiveEventSelection,
          bottomPadding: showTrailingSections
              ? 0
              : CatchLayout.detailScreenBottomPadding,
        ),
        if (showTrailingSections)
          CatchSectionList.sliver(
            emptyStateOmitted: true,
            topPadding: 0,
            children: [
              if (state.showReviews)
                CatchSection.divided(
                  title: context.l10n.clubsClubDetailBodyTitleReviews,
                  child: ClubReviewsSection(
                    reviews: state.reviews,
                    currentUid: state.uid,
                  ),
                ),
              if (state.contactActions.isNotEmpty)
                CatchSection.divided(
                  title: context.l10n.clubsClubDetailBodyTitleGetInTouch,
                  child: ClubContactSection(
                    actions: state.contactActions,
                    showTitle: false,
                    onContactSelected: effectiveContactSelection,
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

List<CatchMetricValue> _clubMetricItems(Club club, AppLocalizations l10n) {
  return [
    CatchMetricValue(
      value: '${club.memberCount}',
      label: l10n.clubsClubDetailBodyLabelMembers,
    ),
    CatchMetricValue(
      value: club.rating > 0 ? club.rating.toStringAsFixed(1) : '—',
      label: l10n.clubsClubDetailBodyLabelRating,
    ),
    CatchMetricValue(
      value: '${club.reviewCount}',
      label: l10n.clubsClubDetailBodyLabelReviews,
    ),
    CatchMetricValue(
      value: clubEstablishedLabel(club),
      label: l10n.clubsClubDetailBodyLabelEst,
    ),
  ];
}

String _clubHeroLocationLabel(Club club, Event? nextEvent) {
  final meetingLocation = nextEvent?.effectiveMeetingLocation;
  final candidates = [
    meetingLocation?.address,
    meetingLocation?.name,
    '${club.area}, ${cityLabel(club.location)}',
  ];
  for (final candidate in candidates) {
    final normalized = candidate?.trim();
    if (normalized != null && normalized.isNotEmpty) return normalized;
  }
  return cityLabel(club.location);
}

class ClubNextRunBanner extends StatelessWidget {
  const ClubNextRunBanner({super.key, required this.event, this.onTap});

  final Event event;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final activity = ActivityPalette.resolve(context, event.activityKind);

    return Semantics(
      button: onTap != null,
      label: _nextRunLabel(event),
      child: CatchSurface(
        onTap: onTap,
        radius: CatchRadius.md,
        padding: _clubActivityTilePadding,
        backgroundColor: activity.soft,
        child: Row(
          children: [
            Icon(activity.glyph, size: CatchIcon.sm, color: activity.deep),
            gapW10,
            Expanded(
              child: Text(
                _nextRunLabel(event),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: CatchTextStyles.monoLabelS(
                  context,
                  color: activity.deep,
                ),
              ),
            ),
            gapW10,
            Icon(
              CatchIcons.arrowForwardRounded,
              size: CatchIcon.sm,
              color: activity.deep,
            ),
          ],
        ),
      ),
    );
  }
}

String _nextRunLabel(Event event) {
  final day = EventFormatters.shortWeekday(event.startTime).toUpperCase();
  final month = EventFormatters.shortMonth(event.startTime).toUpperCase();
  final time = EventFormatters.time(event.startTime).toUpperCase();
  return 'NEXT RUN · $day ${event.startTime.day} $month · $time';
}

class ClubActivitySection extends StatelessWidget {
  const ClubActivitySection({
    super.key,
    required this.club,
    required this.tags,
  });

  final Club club;
  final List<String> tags;

  @override
  Widget build(BuildContext context) {
    final activities = club.hostDefaults.effectiveSupportedActivityKinds;
    final activityLabels = {
      for (final activity in activities) activity.label.toLowerCase(),
    };
    final genericTags = [
      for (final tag in tags)
        if (!activityLabels.contains(tag.toLowerCase())) tag,
    ];
    final firstGenericTag = genericTags.isEmpty ? null : genericTags.first;
    final remainingGenericTags = genericTags.skip(1).toList(growable: false);

    final primaryWrap = Wrap(
      spacing: CatchSpacing.micro6,
      runSpacing: CatchSpacing.micro6,
      children: [
        for (final activity in activities)
          CatchChip.activity(
            data: ActivityPalette.resolve(context, activity).chipData,
            emphasis: activity == club.hostDefaults.primaryActivityKind
                ? CatchChipEmphasis.solid
                : CatchChipEmphasis.soft,
          ),
        if (activities.isEmpty)
          CatchChip.activity(
            data: ActivityPalette.resolve(
              context,
              ActivityKind.openActivity,
            ).chipData,
            label: tags.first,
            emphasis: CatchChipEmphasis.solid,
          ),
        if (firstGenericTag != null)
          ClubTagList(
            tags: [firstGenericTag],
            tone: CatchBadgeTone.neutral,
            size: CatchBadgeSize.md,
          ),
      ],
    );

    if (remainingGenericTags.isEmpty) return primaryWrap;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        primaryWrap,
        gapH6,
        Wrap(
          spacing: CatchSpacing.micro6,
          runSpacing: CatchSpacing.micro6,
          children: [
            for (final tag in remainingGenericTags)
              ClubTagList(
                tags: [tag],
                tone: CatchBadgeTone.neutral,
                size: CatchBadgeSize.md,
              ),
          ],
        ),
      ],
    );
  }
}
