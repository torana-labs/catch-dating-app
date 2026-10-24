import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_event_display_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef ExploreEventSelected =
    void Function(ExploreEventItem item, String source);

class ExploreFeedEventRow extends StatelessWidget {
  const ExploreFeedEventRow({
    super.key,
    required this.item,
    this.onEventSelected,
    this.analyticsSource = 'mixed_row',
    this.stripPosition = EventDateRailCardStripPosition.single,
  });

  final ExploreEventItem item;
  final ExploreEventSelected? onEventSelected;
  final String analyticsSource;
  final EventDateRailCardStripPosition stripPosition;

  @override
  Widget build(BuildContext context) {
    final event = item.event;
    final state = ExploreEventRowState.from(item, l10n: context.l10n);
    final heroTag = eventTicketHeroTag(event.id, analyticsSource);
    final onTap = onEventSelected == null
        ? null
        : () => onEventSelected!(item, analyticsSource);
    final card = EventDateRailCard(
      event: event,
      kicker: state.kicker,
      title: state.title,
      supportingLabel: state.supportingLabel,
      priceLabel: state.priceLabel,
      capacityLabel: state.capacityLabel,
      statusLabel: state.statusLabel,
      showAttendeeSignal: true,
      stripPosition: stripPosition,
      heroTag: heroTag,
      onTap: onTap,
    );
    if (item.status != EventTileStatus.ineligible) return card;
    return Opacity(
      key: ValueKey('explore-ineligible-event-${event.id}'),
      opacity: CatchOpacity.discoveryIneligible,
      child: card,
    );
  }
}

class ExploreExternalEventRow extends StatelessWidget {
  const ExploreExternalEventRow({
    super.key,
    required this.item,
    this.onExternalEventOpened,
  });

  final ExploreExternalEventItem item;
  final ValueChanged<ExploreExternalEventItem>? onExternalEventOpened;

  @override
  Widget build(BuildContext context) {
    final event = item.event;
    final t = CatchTokens.of(context);
    final visual = eventActivityVisual(event.activityKind, context: context);
    final state = ExploreExternalEventRowState.from(item, l10n: context.l10n);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: state.semanticLabel,
      child: CatchSurface.card(
        borderRole: CatchBorderRole.boundary,
        padding: CatchInsets.content,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                EventActivityBadge(
                  visual: visual,
                  size: 26,
                  iconSize: CatchIcon.sm,
                ),
                gapW8,
                Expanded(
                  child: CatchMetadataText(state.sourceLabel, color: t.ink3),
                ),
                gapW8,
                CatchBadge.ticketStatus(
                  label: state.statusLabel,
                  color: visual.accent,
                ),
              ],
            ),
            gapH8,
            Text(
              event.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.eventDisplay(
                context,
                step: CatchTextStylesSize.m,
                height: 1.02,
              ),
            ),
            gapH4,
            CatchText(
              state.supportingLabel,
              maxLines: 1,

              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
            gapH10,
            Row(
              children: [
                CatchClockIndicator(
                  accent: visual.accent,
                  time: TimeOfDay.fromDateTime(event.startTime),
                  size: 17,
                ),
                gapW8,
                Expanded(
                  child: Text(
                    state.timePriceLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.mono(context, color: t.ink2),
                  ),
                ),
                gapW12,
                CatchButton(
                  label: state.actionLabel,
                  leading: Icon(CatchIcons.arrowUpRight, size: CatchIcon.sm),
                  size: CatchButtonSize.sm,
                  variant: CatchButtonVariant.secondary,
                  onPressed: !state.hasExternalLink
                      ? null
                      : () => onExternalEventOpened?.call(item),
                  semanticsLabel: state.actionSemanticsLabel,
                ),
              ],
            ),
            gapH8,
            CatchMetadataText(state.readOnlySupplyLabel, color: t.ink3),
          ],
        ),
      ),
    );
  }
}

class ThisWeekRecommendationsSection extends StatelessWidget {
  const ThisWeekRecommendationsSection({
    super.key,
    required this.items,
    this.onEventSelected,
  });

  final List<ExploreEventItem> items;
  final ExploreEventSelected? onEventSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchMetadataText(
          context.l10n.exploreExploreEventRowsVisiblecopyComingUpLength(
            length: items.length,
          ),
          color: CatchTokens.of(context).ink3,
        ),
        gapH2,
        CatchSectionHeader(
          title: context.l10n.exploreExploreEventRowsTitleThisWeek,
          padding: EdgeInsets.zero,
          titleStyle: CatchTextStyles.clubDisplay(
            context,
            step: CatchTextStylesSize.xl,
            height: 0.92,
          ),
        ),
        gapH12,
        for (var index = 0; index < items.length; index += 1) ...[
          ExploreFeedEventRow(
            item: items[index],
            onEventSelected: onEventSelected,
            analyticsSource: 'this_week',
            stripPosition: eventDateRailCardStripPositionFor(
              index,
              items.length,
            ),
          ),
        ],
      ],
    );
  }
}
