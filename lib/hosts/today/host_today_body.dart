import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
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
///
/// Needs you is one list: the attention items, then the coming events
/// whose join requests or waitlist no item covers yet. A join request or
/// waitlist row with someone waiting opens the requests queue there.
class HostTodayBody extends StatelessWidget {
  const HostTodayBody({
    super.key,
    required this.state,
    required this.now,
    required this.onOpenEvent,
    required this.onOpenAttention,
    required this.onOpenRequests,
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

  /// Opens the requests queue on the first person waiting there.
  final ValueChanged<HostTodayRequestFocus> onOpenRequests;
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
            onOpen: switch (needsYou.requestFocusOf(item)) {
              final focus? => () => onOpenRequests(focus),
              null => () => onOpenAttention(item),
            },
          ),
        // Waiting people no item covers, in the attention row's shape and
        // copy.
        for (final group in needsYou.requestGroups)
          CatchIndexRow(
            key: ValueKey<String>(
              'host-today-requests-${group.focus.eventId}-'
              '${group.focus.kind.name}',
            ),
            title: group.focus.kind == HostRequestKind.request
                ? l10n.hostTodayAttentionJoinTitle
                : l10n.hostsHostHomeScreenStateTitleReviewWaitlist,
            subtitle: group.focus.kind == HostRequestKind.request
                ? l10n.hostTodayAttentionJoinBody(
                    count: group.count,
                    eventName: group.eventName,
                  )
                : l10n.hostTodayAttentionWaitlistBody(
                    count: group.count,
                    eventName: group.eventName,
                  ),
            onTap: () => onOpenRequests(group.focus),
            marker: CatchIndexRowTone.info,
            action: CatchIndexRowAction(
              label: group.focus.kind == HostRequestKind.request
                  ? l10n.hostTodayAttentionReview
                  : l10n.hostsHostHomeScreenStateVisiblecopyReview,
              onPressed: () => onOpenRequests(group.focus),
            ),
            density: CatchIndexRowSize.roomy,
          ),
        if (!needsYou.requestsComplete)
          CatchNotice.inline(
            key: const ValueKey<String>('host-today-requests-partial'),
            tone: CatchNoticeTone.neutral,
            icon: CatchIcons.info,
            body: l10n.hostRequestsPartial,
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
          _HostTodayStatRow(
            stats: hostTodayVisibleStats(
              state.lastThirtyDays,
              wide:
                  CatchRootScope.sizeClassOf(context) ==
                  CatchWindowSize.expanded,
            ),
          ),
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

/// The Last 30 days figures for the width. The sidebar layout has room for
/// all four, two to a row; a phone keeps two, bookings and who came back
/// first, falling back to the others when a figure is missing.
@visibleForTesting
List<HostTodayStat> hostTodayVisibleStats(
  List<HostTodayStat> stats, {
  required bool wide,
}) {
  if (wide) return stats;
  const order = [
    HostTodayStatKind.bookings,
    HostTodayStatKind.cameBack,
    HostTodayStatKind.ticketSales,
    HostTodayStatKind.followers,
  ];
  return [
    for (final kind in order) ...stats.where((stat) => stat.kind == kind),
  ].take(2).toList();
}

/// The stats two to a row, in equal widths; four stats make two rows.
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
      children: [
        for (var start = 0; start < stats.length; start += 2)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              for (final stat in stats.skip(start).take(2))
                HostAnalyticsMetricTile(
                  label: switch (stat.kind) {
                    HostTodayStatKind.bookings => l10n.hostTodayStatBookings,
                    HostTodayStatKind.ticketSales =>
                      l10n.hostTodayStatTicketSales,
                    HostTodayStatKind.cameBack => l10n.hostInsightsCameBack,
                    HostTodayStatKind.followers =>
                      l10n.hostOrganizerStatFollowers,
                  },
                  value: stat.value,
                  previousValue: stat.previousValue,
                  currencyCode: stat.currencyCode,
                  figure: stat.figure,
                ),
            ],
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
