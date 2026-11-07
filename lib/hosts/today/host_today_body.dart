import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_poster.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_week_row.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_attention_row.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Today in board order: tonight's poster and its actions, Needs you, This
/// week and Last 30 days in one column; on expanded windows a feed with the
/// poster, actions and week on the left and Needs you and the stats on the
/// right.
class HostTodayBody extends StatelessWidget {
  const HostTodayBody({
    super.key,
    required this.state,
    required this.now,
    required this.onOpenEvent,
    required this.onOpenAttention,
    required this.onAction,
    required this.onViewEvents,
    required this.onOpenInsights,
    required this.onRetry,
  });

  final HostTodayState state;

  /// The clock the poster reads live, tonight or a later day from.
  final DateTime now;
  final ValueChanged<Event> onOpenEvent;
  final ValueChanged<HostAttentionItem> onOpenAttention;
  final ValueChanged<HostTodayAction> onAction;
  final VoidCallback onViewEvents;
  final VoidCallback onOpenInsights;

  /// Starts the attention reads again after they failed.
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (state.status == HostTodayStatus.loading) {
      return const CatchPageBody(child: _HostTodayLoading());
    }
    final l10n = context.l10n;
    final tonight = state.tonight;
    final poster = tonight == null
        ? null
        : HostEventPoster(
            event: tonight.event,
            now: now,
            newFaces: tonight.newFaces,
            people: tonight.people,
            onTap: () => onOpenEvent(tonight.event),
          );
    final actions = CatchStack(
      direction: CatchStackDirection.row,
      gap: CatchStackGap.g8,
      equal: true,
      children: [
        for (final (index, action) in state.actions.indexed)
          CatchButton(
            label: switch (action) {
              HostTodayAction.openDoor => l10n.hostTodayOpenDoor,
              HostTodayAction.messageGuests => l10n.hostTodayMessageGuests,
              HostTodayAction.liveConsole => l10n.hostTodayLiveConsole,
              HostTodayAction.newEvent => l10n.hostTodayNewEvent,
            },
            leading: CatchIcon(switch (action) {
              HostTodayAction.openDoor => CatchIcons.scanQr,
              HostTodayAction.messageGuests => CatchIcons.chat,
              HostTodayAction.liveConsole => CatchIcons.live,
              HostTodayAction.newEvent => CatchIcons.add,
            }, size: CatchIconSize.md),
            variant: index == 0
                ? CatchButtonVariant.primary
                : CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: () => onAction(action),
          ),
      ],
    );
    final needsYou = state.needsYou;
    final needsYouSection = CatchSection(
      title: l10n.hostTodayNeedsYouTitle,
      note: needsYou.checking
          ? l10n.hostTodayNeedsYouChecking
          : needsYou.dueBeforeDoors > 0
          ? l10n.hostTodayNeedsYouBeforeDoors(count: needsYou.dueBeforeDoors)
          : null,
      action: needsYou.failed
          ? CatchSectionAction(
              label: l10n.hostTodayNeedsYouRetry,
              onPressed: onRetry,
            )
          : null,
      empty: needsYou.checking || needsYou.failed
          ? null
          : l10n.hostTodayNeedsYouEmpty,
      children: [
        for (final item in needsYou.items)
          HostAttentionRow(
            key: ValueKey<String>('host-today-attention-${item.id}'),
            item: item,
            onOpen: () => onOpenAttention(item),
          ),
      ],
    );
    final weekSection = CatchSection(
      title: l10n.hostTodayThisWeekTitle,
      action: CatchSectionAction(
        label: l10n.hostTodayAllEvents,
        onPressed: onViewEvents,
      ),
      empty: l10n.hostTodayThisWeekEmpty,
      children: [
        for (final event in state.thisWeek)
          HostEventWeekRow(
            key: ValueKey<String>('host-today-week-${event.id}'),
            event: event,
            onTap: () => onOpenEvent(event),
          ),
      ],
    );
    final statsSection = CatchSection(
      title: l10n.hostTodayLastThirtyDaysTitle,
      action: CatchSectionAction(
        label: l10n.hostTodayInsights,
        onPressed: onOpenInsights,
      ),
      dividers: CatchSectionPlacement.none,
      empty: l10n.hostTodayLastThirtyDaysEmpty,
      children: [
        if (state.statsPending)
          const CatchSkeleton.content(child: _HostTodayStatRow.placeholder())
        else if (state.lastThirtyDays.isNotEmpty)
          _HostTodayStatRow(stats: state.lastThirtyDays),
      ],
    );

    if (CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded) {
      return CatchPageBody(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.feed,
          children: [
            CatchStack(
              gap: CatchStackGap.g28,
              children: [?poster, actions, weekSection],
            ),
            CatchStack(
              gap: CatchStackGap.g28,
              children: [needsYouSection, statsSection],
            ),
          ],
        ),
      );
    }
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          ?poster,
          actions,
          needsYouSection,
          weekSection,
          statsSection,
        ],
      ),
    );
  }
}

/// The stats side by side in equal widths.
class _HostTodayStatRow extends StatelessWidget {
  const _HostTodayStatRow({required this.stats});

  /// Two stats in the shape of the real row, for the skeleton.
  const _HostTodayStatRow.placeholder()
    : stats = const [
        HostTodayStat(kind: HostTodayStatKind.bookings, value: 0),
        HostTodayStat(kind: HostTodayStatKind.ticketSales, value: 0),
      ];

  final List<HostTodayStat> stats;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchStack(
      direction: CatchStackDirection.row,
      equal: true,
      children: [
        for (final stat in stats)
          HostAnalyticsMetricTile(
            label: switch (stat.kind) {
              HostTodayStatKind.bookings => l10n.hostTodayStatBookings,
              HostTodayStatKind.ticketSales => l10n.hostTodayStatTicketSales,
            },
            value: stat.value,
            previousValue: stat.previousValue,
            currencyCode: stat.currencyCode,
          ),
      ],
    );
  }
}

/// The loading shape: the poster, then the Needs you and This week rows,
/// drawn from the real components.
class _HostTodayLoading extends StatelessWidget {
  const _HostTodayLoading();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final row = CatchIndexRow(
      title: l10n.hostTodayNeedsYouTitle,
      subtitle: l10n.hostTodayNeedsYouEmpty,
      onTap: null,
      density: CatchIndexRowSize.roomy,
    );
    return CatchSkeleton.content(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchEventCard(
            title: l10n.hostTodayNeedsYouTitle,
            format: CatchFormat.games,
            when: l10n.hostTodayWhenLive,
            place: l10n.hostTodayThisWeekTitle,
            counts: [
              CatchMetricValue(value: '0', label: l10n.hostTodayCountBooked),
              CatchMetricValue(value: '0', label: l10n.hostTodayCountWaitlist),
            ],
          ),
          CatchSection(
            title: l10n.hostTodayNeedsYouTitle,
            children: [row, row],
          ),
          CatchSection(
            title: l10n.hostTodayThisWeekTitle,
            children: [row, row],
          ),
        ],
      ),
    );
  }
}
