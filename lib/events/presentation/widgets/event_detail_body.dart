import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_hero_top_bar.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_loading_skeleton.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_overview_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_social_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/reviews/domain/review.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventDetailMessageHostCallback =
    void Function(String clubId, String hostUid);

class EventDetailBody extends StatelessWidget {
  const EventDetailBody({
    super.key,
    required this.event,
    required this.userProfile,
    required this.clubId,
    required this.reviews,
    required this.isAuthenticated,
    required this.sectionVisibility,
    required this.isSaved,
    required this.participation,
    required this.savePending,
    required this.onBack,
    required this.onShare,
    this.showShareAction = true,
    required this.showAddToCalendar,
    required this.onAddToCalendar,
    required this.onToggleSaved,
    required this.companionState,
    required this.hostState,
    required this.socialState,
    required this.informationState,
    required this.onLocationTap,
    required this.onOpenCompanion,
    required this.onRetryCompanion,
    required this.onViewClub,
    required this.onMessageHost,
    required this.onRetryHosts,
    this.surfaceStyle,
    this.inviteCode,
    this.inviteLinkId,
    this.now,
    this.presentationMode = EventDetailPresentationMode.standard,
    this.heroTag,
    this.enableMapNetworkTiles = true,
    this.crossPathsConsentState =
        const CrossPathsEventConsentSectionState.hidden(),
    this.onCrossPathsConsentChanged,
    this.messagePreferencesSection,
  });

  final Event event;
  final UserProfile? userProfile;
  final String clubId;
  final List<Review> reviews;
  final bool isAuthenticated;
  final EventDetailSectionVisibilityState sectionVisibility;
  final bool isSaved;
  final EventParticipation? participation;
  final EventDetailSurfaceStyle? surfaceStyle;
  final bool savePending;
  final VoidCallback onBack;
  final ValueChanged<BuildContext> onShare;
  final bool showShareAction;
  final bool showAddToCalendar;
  final ValueChanged<BuildContext> onAddToCalendar;
  final VoidCallback onToggleSaved;
  final EventDetailCompanionState companionState;
  final EventDetailHostState hostState;
  final EventDetailSocialState socialState;
  final EventDetailInformationState informationState;
  final VoidCallback? onLocationTap;
  final VoidCallback onOpenCompanion;
  final VoidCallback onRetryCompanion;
  final ValueChanged<String> onViewClub;
  final EventDetailMessageHostCallback onMessageHost;
  final VoidCallback onRetryHosts;
  final String? inviteCode;
  final String? inviteLinkId;
  final DateTime? now;
  final EventDetailPresentationMode presentationMode;
  final Object? heroTag;
  final bool enableMapNetworkTiles;
  final CrossPathsEventConsentSectionState crossPathsConsentState;
  final ValueChanged<bool>? onCrossPathsConsentChanged;
  final Widget? messagePreferencesSection;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final event = this.event;
    final userProfile = this.userProfile;
    final isSpotlightDark =
        presentationMode == EventDetailPresentationMode.spotlightDark;
    final style =
        surfaceStyle ??
        (isSpotlightDark
            ? EventDetailSurfaceStyle.dark(t)
            : EventDetailSurfaceStyle.light(
                t,
                useWhite:
                    presentationMode == EventDetailPresentationMode.ticket,
              ));

    return CustomScrollView(
      key: const ValueKey('event_detail.scroll_view'),
      slivers: [
        EventDetailHeroTopBar(
          event: event,
          isSaved: isSaved,
          savePending: savePending,
          onBack: onBack,
          onShare: onShare,
          showShareAction: showShareAction,
          showAddToCalendar: showAddToCalendar,
          onAddToCalendar: onAddToCalendar,
          presentationMode: presentationMode,
          heroTag: heroTag,
          onToggleSaved: onToggleSaved,
        ),
        SliverToBoxAdapter(
          child: EventDetailTicketStubRow(
            event: event,
            notchBackgroundColor: style.pageBackground,
          ),
        ),
        CatchSectionList.sliver(
          emptyStateOmitted: true,
          topPadding: CatchSpacing.screenPt,
          bottomPadding: CatchSpacing.screenPb,
          children: [
            EventDetailOverviewSection(
              event: event,
              informationState: informationState,
              surfaceStyle: style,
              onLocationTap: onLocationTap,
              enableMapNetworkTiles: enableMapNetworkTiles,
            ),
            EventCompanionCard(
              state: companionState,
              surfaceStyle: style,
              onOpen: onOpenCompanion,
              onRetry: onRetryCompanion,
            ),
            if (sectionVisibility.showInviteLoop)
              EventDetailCalloutCard(
                leadingIcon: CatchIcons.platformShare(
                  platform: Theme.of(context).platform,
                ),
                title:
                    context.l10n.eventsEventDetailBodyTitleBringSomeoneIntoThe,
                body: context.l10n.eventsEventDetailBodyBodyYourSpotIsBooked,
                actionLabel:
                    context.l10n.eventsEventDetailBodyActionlabelInviteAFriend,
                actionIcon: CatchIcons.sendRounded,
                onAction: onShare,
                surfaceStyle: style,
                borderColor: style.isDark
                    ? style.borderColor
                    : CatchTokens.of(context).primary.withValues(
                        alpha: CatchOpacity.eventDetailLightBorder,
                      ),
              ),
            CrossPathsEventConsentSection(
              state: crossPathsConsentState,
              onChanged: onCrossPathsConsentChanged,
            ),
            ?messagePreferencesSection,
            EventDetailHostsSection(
              event: event,
              state: hostState,
              onViewClub: onViewClub,
              onMessageHost: onMessageHost,
              onRetry: onRetryHosts,
              surfaceStyle: style,
            ),
            EventDetailSocialSection(
              event: event,
              clubId: clubId,
              reviews: reviews,
              userProfile: userProfile,
              state: socialState,
              now: now ?? DateTime.now(),
              surfaceStyle: style,
            ),
          ],
        ),
      ],
    );
  }
}

class EventDetailCalloutCard extends StatelessWidget {
  const EventDetailCalloutCard({
    super.key,
    required this.leadingIcon,
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.actionIcon,
    required this.onAction,
    required this.surfaceStyle,
    this.borderColor,
  });

  final IconData leadingIcon;
  final String title;
  final String body;
  final String actionLabel;
  final IconData actionIcon;
  final ValueChanged<BuildContext> onAction;
  final EventDetailSurfaceStyle surfaceStyle;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      backgroundColor: surfaceStyle.surfaceBackground,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.separator,
        color: borderColor ?? surfaceStyle.borderColor,
      ),
      padding: CatchInsets.tileContentCompact,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(leadingIcon, color: t.primary),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  title,
                  variant: CatchTextVariant.sectionTitle,
                  color: surfaceStyle.headingColor,
                ),
                gapH4,
                CatchText(
                  body,
                  variant: CatchTextVariant.supporting,
                  color: surfaceStyle.bodyColor,
                ),
                gapH12,
                Builder(
                  builder: (buttonContext) => CatchButton(
                    label: actionLabel,
                    variant: CatchButtonVariant.secondary,
                    leading: Icon(actionIcon),
                    onPressed: () => onAction(buttonContext),
                    fullWidth: true,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class EventCompanionCard extends StatelessWidget {
  const EventCompanionCard({
    super.key,
    required this.state,
    required this.surfaceStyle,
    required this.onOpen,
    required this.onRetry,
  });

  final EventDetailCompanionState state;
  final EventDetailSurfaceStyle surfaceStyle;
  final VoidCallback onOpen;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return switch (state.status) {
      EventDetailCompanionStatus.hidden => const SizedBox.shrink(),
      EventDetailCompanionStatus.loading => EventDetailCompanionSkeleton(
        surfaceStyle: surfaceStyle,
      ),
      EventDetailCompanionStatus.error => CatchLocalizedErrorState(
        state.error!,
        onRetry: onRetry,
        mode: CatchErrorStateMode.compact,
      ),
      EventDetailCompanionStatus.available => EventDetailCalloutCard(
        leadingIcon: CatchIcons.autoAwesomeOutlined,
        title: context.l10n.eventsEventDetailBodyTitleEventCompanion,
        body: context.l10n.eventsEventDetailBodyBodyCheckInSeeYour,
        actionLabel: context.l10n.eventsEventDetailBodyActionlabelOpenCompanion,
        actionIcon: CatchIcons.phoneIphoneRounded,
        onAction: (_) => onOpen(),
        surfaceStyle: surfaceStyle,
      ),
    };
  }
}

class GuestBookDock extends StatelessWidget {
  const GuestBookDock({
    super.key,
    required this.onPressed,
    this.darkSurface = false,
  });

  final VoidCallback onPressed;
  final bool darkSurface;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchDock.primary(
      label: context.l10n.eventsEventDetailBodyLabelSignInToBook,
      onPressed: onPressed,
      backgroundColor: darkSurface ? t.ink : t.surface,
    );
  }
}

/// Compact host identity, with all affordances derived from available actions.
class EventDetailHostsSection extends StatelessWidget {
  const EventDetailHostsSection({
    super.key,
    required this.event,
    required this.state,
    required this.onViewClub,
    required this.onMessageHost,
    required this.onRetry,
    this.surfaceStyle,
  });

  final Event event;
  final EventDetailHostState state;
  final ValueChanged<String> onViewClub;
  final EventDetailMessageHostCallback onMessageHost;
  final VoidCallback onRetry;
  final EventDetailSurfaceStyle? surfaceStyle;

  @override
  Widget build(BuildContext context) {
    switch (state.status) {
      case EventDetailHostStatus.hidden:
        return const SizedBox.shrink();
      case EventDetailHostStatus.loading:
        return EventDetailHostsSkeleton(surfaceStyle: surfaceStyle);
      case EventDetailHostStatus.error:
        return CatchLocalizedErrorState(
          state.error!,
          onRetry: onRetry,
          mode: CatchErrorStateMode.compact,
        );
      case EventDetailHostStatus.content:
        final clubId = state.clubId!;
        final hostUid = state.hostUid;
        final canMessage = state.canMessage && hostUid != null;

        return CatchSection.containedRows(
          title: context.l10n.eventsEventDetailBodyTitleHostedBy,
          children: [
            CatchField.navigate(
              onActivate: () => onViewClub(clubId),
              content: CatchPersonLayout(
                name: state.hostName!,
                imageUrl: state.photoUrl,
                supportingText: state.meta,
                avatarColors: ActivityPalette.resolve(
                  context,
                  event.activityKind,
                ).avatarColors,
                badges: [
                  if (state.verified)
                    CatchRowBadge(
                      label: context.l10n.organizersAuthorityBadgeOwnerVerified,
                      tone: CatchBadgeTone.success,
                      icon: CatchIcons.sealCheck,
                    ),
                ],
              ),
              secondaryAction: canMessage
                  ? CatchFieldSecondaryAction.command(
                      label:
                          context.l10n.eventsEventDetailBodyTooltipMessageHost,
                      icon: CatchIcons.chatBubbleOutlineRounded,
                      onActivate: () => onMessageHost(clubId, hostUid),
                    )
                  : null,
            ),
          ],
        );
    }
  }
}
