import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/host_memberships/host_memberships.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/organizers.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_contact_section.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_formatters.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_host_section.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_photo_rail.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef OrganizerEventSelectionHandler = void Function(Event event);

enum OrganizerDetailPresentationMode { route, embeddedReadOnlyPreview }

const EdgeInsets _organizerActivityTilePadding = EdgeInsets.symmetric(
  horizontal: CatchSpacing.s4,
  vertical: CatchSpacing.s3,
);

class OrganizerDetailBody extends StatelessWidget {
  const OrganizerDetailBody({
    super.key,
    required this.state,
    this.onShareOrganizer,
    this.onEventSelected,
    this.onViewHostProfile,
    this.onMessageHost,
    this.onContactSelected,
    this.presentationMode = OrganizerDetailPresentationMode.route,
  });

  final OrganizerDetailBodyState state;
  final OrganizerShareHandler? onShareOrganizer;
  final OrganizerEventSelectionHandler? onEventSelected;
  final OrganizerHostProfileHandler? onViewHostProfile;
  final OrganizerHostMessageHandler? onMessageHost;
  final OrganizerContactActionHandler? onContactSelected;
  final OrganizerDetailPresentationMode presentationMode;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: t.bg,
      child: CustomScrollView(
        slivers: [
          OrganizerDetailSliverBody(
            state: state,
            onShareOrganizer: onShareOrganizer,
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
class OrganizerDetailSliverBody extends StatelessWidget {
  const OrganizerDetailSliverBody({
    super.key,
    required this.state,
    this.onShareOrganizer,
    this.onEventSelected,
    this.onViewHostProfile,
    this.onMessageHost,
    this.onContactSelected,
    this.presentationMode = OrganizerDetailPresentationMode.route,
  });

  final OrganizerDetailBodyState state;
  final OrganizerShareHandler? onShareOrganizer;
  final OrganizerEventSelectionHandler? onEventSelected;
  final OrganizerHostProfileHandler? onViewHostProfile;
  final OrganizerHostMessageHandler? onMessageHost;
  final OrganizerContactActionHandler? onContactSelected;
  final OrganizerDetailPresentationMode presentationMode;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final organizer = state.organizer;
    final tags = visibleOrganizerTags(organizer, limit: 6);
    final nextEvent = state.nextEvent;
    final showTrailingSections =
        state.showReviews || state.contactActions.isNotEmpty;
    final embeddedPreview =
        presentationMode ==
        OrganizerDetailPresentationMode.embeddedReadOnlyPreview;
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
        OrganizerHeroTopBar(
          organizer: organizer,
          isHost: state.isHost,
          locationLabel: _organizerHeroLocationLabel(organizer, nextEvent),
          onShareOrganizer: embeddedPreview ? null : onShareOrganizer,
          presentationMode: embeddedPreview
              ? OrganizerHeroPresentationMode.embeddedReadOnlyPreview
              : OrganizerHeroPresentationMode.route,
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
                  OrganizerNextRunBanner(
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
                    state: organizer.organizerAuthority.trustState,
                  ),
                ),
                gapH12,
                CatchMetricSection.grid(
                  items: _organizerMetricItems(organizer, context.l10n),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchSection.divided(
                  title: context.l10n.organizersOrganizerDetailBodyTitleAbout,
                  first: true,
                  child: CatchText(
                    organizer.description,
                    variant: CatchTextVariant.bodyL,
                    color: t.ink,
                  ),
                ),
                if (tags.isNotEmpty)
                  CatchSection.divided(
                    title:
                        context.l10n.organizersOrganizerDetailBodyTitleWhatWeDo,
                    child: OrganizerActivitySection(
                      organizer: organizer,
                      tags: tags,
                    ),
                  ),
                if (organizer.organizerPhotos.isNotEmpty)
                  CatchSection.divided(
                    title: context
                        .l10n
                        .organizersOrganizerDetailBodyTitleFromTheOrganizer,
                    child: OrganizerPhotoRail(organizer: organizer),
                  ),
                if (organizer.displayHostProfiles.isNotEmpty)
                  CatchSection.divided(
                    title: context
                        .l10n
                        .organizersOrganizerDetailBodyTitleYourHosts,
                    count: organizer.displayHostProfiles.length,
                    child: OrganizerHostSection(
                      organizer: organizer,
                      canViewProfile:
                          state.isAuthenticated &&
                          effectiveHostProfileSelection != null,
                      isMessageHostPending: state.isMessageHostPending,
                      messageableHostUids: state.messageableHostUids,
                      onViewProfile: effectiveHostProfileSelection,
                      onMessageHost: effectiveHostMessage,
                    ),
                  ),
                // Members join from the public organizer page; hosts manage
                // plans in Catch Host instead.
                if (!embeddedPreview && !state.isHost && state.isAuthenticated)
                  HostMembershipPlansSection(organizerId: organizer.id),
              ],
            ),
          ],
        ),
        OrganizerScheduleSection(
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
                  title: context.l10n.organizersOrganizerDetailBodyTitleReviews,
                  child: OrganizerReviewsSection(
                    reviews: state.reviews,
                    currentUid: state.uid,
                  ),
                ),
              if (state.contactActions.isNotEmpty)
                CatchSection.divided(
                  title:
                      context.l10n.organizersOrganizerDetailBodyTitleGetInTouch,
                  child: OrganizerContactSection(
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

List<CatchMetricValue> _organizerMetricItems(
  Organizer organizer,
  AppLocalizations l10n,
) {
  return [
    CatchMetricValue(
      value: '${organizer.memberCount}',
      label: l10n.organizersOrganizerDetailBodyLabelMembers,
    ),
    CatchMetricValue(
      value: organizer.rating > 0 ? organizer.rating.toStringAsFixed(1) : '—',
      label: l10n.organizersOrganizerDetailBodyLabelRating,
    ),
    CatchMetricValue(
      value: '${organizer.reviewCount}',
      label: l10n.organizersOrganizerDetailBodyLabelReviews,
    ),
    CatchMetricValue(
      value: organizerEstablishedLabel(organizer),
      label: l10n.organizersOrganizerDetailBodyLabelEst,
    ),
  ];
}

String _organizerHeroLocationLabel(Organizer organizer, Event? nextEvent) {
  final meetingLocation = nextEvent?.effectiveMeetingLocation;
  final candidates = [
    meetingLocation?.address,
    meetingLocation?.name,
    '${organizer.area}, ${cityLabel(organizer.location)}',
  ];
  for (final candidate in candidates) {
    final normalized = candidate?.trim();
    if (normalized != null && normalized.isNotEmpty) return normalized;
  }
  return cityLabel(organizer.location);
}

class OrganizerNextRunBanner extends StatelessWidget {
  const OrganizerNextRunBanner({super.key, required this.event, this.onTap});

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
        padding: _organizerActivityTilePadding,
        backgroundColor: activity.soft,
        child: Row(
          children: [
            Icon(activity.glyph, size: CatchIconSize.sm, color: activity.deep),
            gapW10,
            Expanded(
              child: CatchMetadataText(
                _nextRunLabel(event),
                color: activity.deep,
              ),
            ),
            gapW10,
            Icon(
              CatchIcons.forward,
              size: CatchIconSize.sm,
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

class OrganizerActivitySection extends StatelessWidget {
  const OrganizerActivitySection({
    super.key,
    required this.organizer,
    required this.tags,
  });

  final Organizer organizer;
  final List<String> tags;

  @override
  Widget build(BuildContext context) {
    final activities = organizer.hostDefaults.effectiveSupportedActivityKinds;
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
            emphasis: activity == organizer.hostDefaults.primaryActivityKind
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
          OrganizerTagList(
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
              OrganizerTagList(
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
