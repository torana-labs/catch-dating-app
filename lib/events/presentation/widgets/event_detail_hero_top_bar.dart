import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_thumbnail.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_photo_header.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventDetailHeroTopBar extends StatelessWidget {
  const EventDetailHeroTopBar({
    super.key,
    required this.event,
    required this.isSaved,
    required this.savePending,
    required this.onBack,
    required this.onShare,
    required this.onToggleSaved,
    required this.showAddToCalendar,
    required this.onAddToCalendar,
    this.showShareAction = true,
    this.presentationMode = EventDetailPresentationMode.standard,
    this.heroTag,
  });

  final Event event;
  final bool isSaved;
  final bool savePending;
  final VoidCallback onBack;
  final ValueChanged<BuildContext> onShare;
  final VoidCallback onToggleSaved;
  final bool showAddToCalendar;
  final ValueChanged<BuildContext> onAddToCalendar;
  final bool showShareAction;
  final EventDetailPresentationMode presentationMode;
  final Object? heroTag;

  @override
  Widget build(BuildContext context) {
    return CatchViewport.sliver(
      sliverBuilder: (context, viewport) {
        const d = CatchTokens.dark;
        final t = CatchTokens.of(context);
        final width = viewport.width;
        final isTicketPresentation =
            presentationMode != EventDetailPresentationMode.standard;
        final isSpotlight =
            presentationMode == EventDetailPresentationMode.spotlightDark;
        final overlayScrim = CatchTokens.editorialBlack.withValues(
          alpha: CatchOpacity.eventHeroOverlayScrim,
        );
        final expandedHeight = _expandedHeightFor(
          width: width,
          isTicketPresentation: isTicketPresentation,
        );
        final collapsedBackground = isSpotlight ? t.ink : t.surface;
        final collapsedForeground = isSpotlight ? t.primaryInk : t.ink;

        return SliverAppBar(
          expandedHeight: expandedHeight,
          pinned: true,
          backgroundColor: collapsedBackground,
          elevation: 0,
          centerTitle: false,
          titleSpacing: 0,
          title: CatchCollapsedHeaderTitle(
            title: event.title,
            textKey: ValueKey(
              context
                  .l10n
                  .eventsEventDetailHeroAppBarTitleEventDetailCollapsedTitle,
            ),
            style: CatchTextStyles.displayXs(
              context,
              color: collapsedForeground,
            ),
          ),
          leadingWidth: CatchSpacing.screenPx + CatchIconAction.navSize,
          leading: Padding(
            padding: CatchInsets.topBarLeadingAction,
            child: CatchIconAction(
              tooltip: context.l10n.eventsEventDetailHeroAppBarTooltipBack,
              backgroundColor: overlayScrim,
              onPressed: onBack,
              child: Icon(
                CatchIcons.backArrow,
                color: d.ink,
                size: CatchIconSize.md,
              ),
            ),
          ),
          actions: [
            Padding(
              padding: CatchInsets.topBarTrailingActions,
              child: CatchTopBarActionRow(
                actions: [
                  if (showShareAction)
                    Builder(
                      builder: (buttonContext) => CatchIconAction(
                        tooltip: context
                            .l10n
                            .eventsEventDetailHeroAppBarTooltipShareEvent,
                        backgroundColor: overlayScrim,
                        onPressed: () => onShare(buttonContext),
                        child: Icon(
                          CatchIcons.platformShare(
                            platform: Theme.of(context).platform,
                          ),
                          color: d.ink,
                          size: CatchIconSize.md,
                        ),
                      ),
                    ),
                  if (showAddToCalendar)
                    Builder(
                      builder: (buttonContext) => CatchIconAction(
                        tooltip: context
                            .l10n
                            .eventsEventDetailHeroAppBarTooltipAddToCalendar,
                        backgroundColor: overlayScrim,
                        onPressed: () => onAddToCalendar(buttonContext),
                        child: Icon(
                          CatchIcons.calendarAdd,
                          color: d.ink,
                          size: CatchIconSize.md,
                        ),
                      ),
                    ),
                  CatchIconAction(
                    tooltip: isSaved
                        ? context
                              .l10n
                              .eventsEventDetailHeroAppBarTooltipUnsaveEvent
                        : context
                              .l10n
                              .eventsEventDetailHeroAppBarTooltipSaveEvent,
                    backgroundColor: overlayScrim,
                    onPressed: savePending ? null : onToggleSaved,
                    child: Icon(
                      isSaved ? CatchIcons.saved : CatchIcons.savedOutlined,
                      color: d.ink,
                      size: CatchIconSize.md,
                    ),
                  ),
                ],
              ),
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            collapseMode: CollapseMode.pin,
            background: isTicketPresentation
                ? EventDetailTicketHeroSurface(
                    event: event,
                    presentationMode: presentationMode,
                    heroTag: heroTag,
                  )
                : EventPhotoHeroSurface(event: event),
          ),
        );
      },
    );
  }
}

double _expandedHeightFor({
  required double width,
  required bool isTicketPresentation,
}) {
  if (isTicketPresentation) {
    return width > CatchLayout.maxContentWidth
        ? CatchLayout.eventDetailHeroTicketWideHeight
        : CatchLayout.eventDetailHeroTicketPhoneHeight;
  }

  if (width > CatchLayout.maxContentWidth) {
    return CatchLayout.eventDetailHeroStandardWideHeight;
  }

  return (width * CatchLayout.eventDetailHeroStandardHeightRatio)
      .clamp(
        CatchLayout.eventDetailHeroStandardMinHeight,
        CatchLayout.eventDetailHeroStandardMaxHeight,
      )
      .toDouble();
}

class EventPhotoHeroSurface extends StatelessWidget {
  const EventPhotoHeroSurface({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    const d = CatchTokens.dark;
    final visual = eventActivityVisual(event.activityKind, context: context);
    return Stack(
      fit: StackFit.expand,
      children: [
        EventPhotoHeader(event: event),
        Positioned(
          left: CatchSpacing.s5,
          right: CatchSpacing.s5,
          bottom: CatchLayout.eventDetailHeroTitleBottomInset,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: HeroActivityBadge(visual: visual),
              ),
              const SizedBox(height: CatchSpacing.s3),
              CatchText(
                event.title,
                variant: CatchTextVariant.displayS,
                color: d.ink,
                maxLines: 2,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class EventDetailTicketHeroSurface extends StatelessWidget {
  const EventDetailTicketHeroSurface({
    super.key,
    required this.event,
    required this.presentationMode,
    this.heroTag,
  });

  final Event event;
  final EventDetailPresentationMode presentationMode;
  final Object? heroTag;

  @override
  Widget build(BuildContext context) {
    final surface = EventDetailTicketSurface(
      event: event,
      presentationMode: presentationMode,
    );
    final tag = heroTag;
    if (tag == null) return surface;
    return CatchHeroViewport(tag: tag, child: surface);
  }
}

class EventDetailTicketSurface extends StatelessWidget {
  const EventDetailTicketSurface({
    super.key,
    required this.event,
    required this.presentationMode,
  });

  final Event event;
  final EventDetailPresentationMode presentationMode;

  @override
  Widget build(BuildContext context) {
    const d = CatchTokens.dark;
    final t = CatchTokens.of(context);
    final visual = eventActivityVisual(event.activityKind, context: context);
    final isSpotlight =
        presentationMode == EventDetailPresentationMode.spotlightDark;
    final bodyColor = isSpotlight ? t.ink : t.surface;
    final titleColor = isSpotlight ? t.primaryInk : t.ink;
    final metaColor = isSpotlight
        ? t.primaryInk.withValues(alpha: CatchOpacity.eventHeroMutedInk)
        : t.ink2;
    final lineColor = isSpotlight ? d.line : t.line2;

    return CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: bodyColor,
      child: CatchTicket.hero(
        lineColor: lineColor,
        mediaBuilder: (context, compact) => Stack(
          fit: StackFit.expand,
          children: [
            EventThumbnail(
              photoUrl: event.primaryPhotoUrl,
              pace: event.pace,
              activityKind: event.activityKind,
              scrim: CatchMediaOverlayVariant.none,
              iconAlignment: Alignment.centerRight,
              fallbackIconSize: CatchLayout.eventHeroBackdropIconSize,
              fallbackIconOpacity: 0.15,
              fallbackPatternOpacity: 0.24,
            ),
            CatchSurface(
              tone: CatchSurfaceTone.transparent,
              radius: 0,
              padding: EdgeInsets.zero,
              duration: Duration.zero,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  CatchTokens.editorialBlack.withValues(
                    alpha: CatchOpacity.eventHeroGradientMidScrim,
                  ),
                  CatchTokens.editorialBlack.withValues(
                    alpha: isSpotlight
                        ? CatchOpacity.eventHeroSpotlightBottomScrim
                        : CatchOpacity.eventHeroGradientBottomScrim,
                  ),
                ],
                stops: const [0, 0.52, 1],
              ),
              child: const SizedBox.expand(),
            ),
            Positioned(
              left: CatchSpacing.s5,
              right: CatchSpacing.s5,
              bottom: CatchSpacing.s5,
              child: compact
                  ? const SizedBox.shrink()
                  : Row(
                      children: [
                        HeroActivityBadge(visual: visual),
                        const Spacer(),
                        HeroTimeChip(event: event),
                      ],
                    ),
            ),
          ],
        ),
        bodyBuilder: (context, compact) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchText(
              event.title,
              variant: CatchTextVariant.displayS,
              color: titleColor,
              maxLines: 2,
            ),
            if (!compact) ...[
              const SizedBox(height: CatchLayout.detailScreenInlineRowGap),
              CatchText(
                _heroSubtitle(event),
                variant: CatchTextVariant.supportingStrong,
                color: metaColor,
                maxLines: 2,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class HeroActivityBadge extends StatelessWidget {
  const HeroActivityBadge({super.key, required this.visual});

  final EventActivityVisualSpec visual;

  @override
  Widget build(BuildContext context) {
    const d = CatchTokens.dark;
    // Design-system EventHero activity tag: frosted pill carrying the activity
    // glyph + label (the only chroma is the glyph; chrome stays neutral).
    return CatchSurface(
      padding: CatchInsets.compactLabelContent,
      radius: CatchRadius.pill,
      backgroundColor: d.ink.withValues(alpha: CatchOpacity.lightOverlayFill),
      borderSpec: CatchBorder.resolve(
        d,
        CatchBorderRole.boundary,
        color: d.ink.withValues(alpha: CatchOpacity.lightOverlayBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            visual.icon,
            color: d.ink,
            size: CatchLayout.activityChipIconSize,
          ),
          const SizedBox(width: CatchSpacing.micro6),
          Text(
            visual.label.toUpperCase(),
            style: CatchTextStyles.monoLabel(context, color: d.ink),
          ),
        ],
      ),
    );
  }
}

class HeroTimeChip extends StatelessWidget {
  const HeroTimeChip({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    const d = CatchTokens.dark;
    return CatchSurface(
      padding: CatchInsets.compactControlContent,
      radius: CatchRadius.md,
      backgroundColor: d.ink.withValues(alpha: CatchOpacity.subtleFill),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            EventFormatters.shortWeekday(event.localStartTime).toUpperCase(),
            style: CatchTextStyles.monoLabel(
              context,
              color: d.ink.withValues(alpha: CatchOpacity.eventHeroMutedInk),
            ),
          ),
          gapH2,
          CatchText(
            EventFormatters.time(event.localStartTime),
            variant: CatchTextVariant.sectionTitle,
            color: d.ink,
          ),
        ],
      ),
    );
  }
}

String _heroSubtitle(Event event) {
  final price = event.priceInPaise <= 0
      ? 'Free'
      : EventFormatters.priceInPaise(
          event.priceInPaise,
          currencyCode: event.currency,
        );
  return '${event.locationName} - ${event.activitySummaryLabel} - $price';
}
