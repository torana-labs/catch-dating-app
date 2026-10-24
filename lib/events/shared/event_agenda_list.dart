import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventBadgeLabelBuilder = String? Function(Event event);
typedef ClubNameBuilder = String? Function(Event event);
typedef EventTileStatusBuilder = EventTileStatus Function(Event event);
typedef EventAgendaDayKeyBuilder = Key? Function(DateTime date);

class EventAgendaSliverList extends StatelessWidget {
  const EventAgendaSliverList({
    super.key,
    this.events = const <Event>[],
    this.agendaRows,
    this.onEventSelected,
    this.badgeLabel,
    this.badgeLabelBuilder,
    this.clubNameBuilder,
    this.statusBuilder,
    this.showClubName = false,
    this.today,
    this.preserveInputOrder = false,
    this.dayKeyBuilder,
    this.padding = const EdgeInsets.fromLTRB(
      CatchLayout.detailScreenHorizontalPadding,
      CatchLayout.agendaListTopPadding,
      CatchLayout.detailScreenHorizontalPadding,
      CatchLayout.agendaListBottomPadding,
    ),
    this.dayLabelBottomGap = CatchLayout.agendaDayLabelBottomGap,
    this.groupGap = CatchLayout.agendaGroupGap,
  });

  final List<Event> events;
  final List<EventAgendaRow>? agendaRows;
  final ValueChanged<Event>? onEventSelected;
  final String? badgeLabel;
  final EventBadgeLabelBuilder? badgeLabelBuilder;
  final ClubNameBuilder? clubNameBuilder;
  final EventTileStatusBuilder? statusBuilder;
  final bool showClubName;
  final DateTime? today;
  final bool preserveInputOrder;
  final EventAgendaDayKeyBuilder? dayKeyBuilder;
  final EdgeInsetsGeometry padding;
  final double dayLabelBottomGap;
  final double groupGap;

  @override
  Widget build(BuildContext context) {
    final rows = agendaRows ?? _agendaRowsFromEvents();
    final grouped = groupEventDateRailItems(
      rows,
      startTimeOf: (row) => row.event.startTime,
      preserveInputOrder: preserveInputOrder,
    );
    final effectiveToday = today ?? DateTime.now();
    final entries = grouped.entries.toList(growable: false);
    final children = [
      for (var groupIndex = 0; groupIndex < entries.length; groupIndex++) ...[
        KeyedSubtree(
          key: dayKeyBuilder?.call(entries[groupIndex].key),
          child: AgendaDaySection(
            date: entries[groupIndex].key,
            rows: entries[groupIndex].value,
            today: effectiveToday,
            onEventSelected: onEventSelected,
            showClubName: showClubName,
            dayLabelBottomGap: dayLabelBottomGap,
          ),
        ),
        if (groupIndex < entries.length - 1) SizedBox(height: groupGap),
      ],
    ];

    return SliverPadding(
      padding: padding,
      sliver: dayKeyBuilder == null
          ? SliverList.list(children: children)
          : SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: children,
              ),
            ),
    );
  }

  List<EventAgendaRow> _agendaRowsFromEvents() {
    return [for (final event in events) _agendaRowFor(event)];
  }

  EventAgendaRow _agendaRowFor(Event event) {
    final effectiveBadgeLabel = badgeLabelBuilder?.call(event) ?? badgeLabel;
    return EventAgendaRow(
      event: event,
      badgeLabel: effectiveBadgeLabel,
      clubName: clubNameBuilder?.call(event),
      status:
          statusBuilder?.call(event) ??
          eventTileStatusForBadge(effectiveBadgeLabel),
    );
  }
}

class EventAgendaRow {
  const EventAgendaRow({
    required this.event,
    this.badgeLabel,
    this.clubName,
    this.status,
  });

  final Event event;
  final String? badgeLabel;
  final String? clubName;
  final EventTileStatus? status;
}

class EventAgendaSliverSkeleton extends StatelessWidget {
  const EventAgendaSliverSkeleton({
    super.key,
    this.count = 4,
    this.padding = const EdgeInsets.fromLTRB(
      CatchLayout.detailScreenHorizontalPadding,
      CatchLayout.agendaListTopPadding,
      CatchLayout.detailScreenHorizontalPadding,
      CatchLayout.agendaListBottomPadding,
    ),
    this.dayLabelBottomGap = CatchLayout.agendaDayLabelBottomGap,
    this.itemGap = CatchLayout.agendaItemGap,
  });

  final int count;
  final EdgeInsetsGeometry padding;
  final double dayLabelBottomGap;
  final double itemGap;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: padding,
      sliver: SliverList.list(
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextEyebrowWidth),
          SizedBox(height: dayLabelBottomGap),
          for (var i = 0; i < count; i++) ...[
            const EventAgendaTileSkeleton(),
            if (i < count - 1) SizedBox(height: itemGap),
          ],
        ],
      ),
    );
  }
}

class EventAgendaTileSkeleton extends StatelessWidget {
  const EventAgendaTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      borderRole: CatchBorderRole.boundary,
      radius: CatchRadius.md,
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSkeleton.custom(
              child: Container(
                width: CatchLayout.eventDateRailWidth,
                decoration: const BoxDecoration(
                  color: CatchTokens.editorialWhite,
                  borderRadius: BorderRadius.horizontal(
                    left: Radius.circular(CatchRadius.md),
                  ),
                ),
                child: Padding(
                  padding: CatchInsets.contentDense,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CatchSkeleton.text(
                        width: CatchLayout.skeletonTextDateWidth,
                      ),
                      gapH6,
                      CatchSkeleton.text(
                        width: CatchLayout.skeletonTextMicroWidth,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: CatchInsets.listBody,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        CatchSkeleton.circle(
                          size: CatchLayout.eventTypeDisplaySize,
                        ),
                        gapW8,
                        Expanded(child: CatchSkeleton.text()),
                        gapW8,
                        CatchSkeleton.box(
                          width: CatchLayout.skeletonTextChipWidth,
                          height: CatchSpacing.s5,
                          radius: CatchRadius.pill,
                        ),
                      ],
                    ),
                    gapH8,
                    CatchSkeleton.text(),
                    gapH6,
                    FractionallySizedBox(
                      widthFactor: 0.72,
                      child: CatchSkeleton.text(),
                    ),
                    gapH10,
                    Row(
                      children: [
                        CatchSkeleton.circle(size: CatchIcon.profileRunStat),
                        gapW8,
                        CatchSkeleton.text(
                          width: CatchLayout.skeletonTextRowWidth,
                        ),
                      ],
                    ),
                    gapH8,
                    CatchSkeleton.text(
                      width: CatchLayout.skeletonTextBodyWidth,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AgendaDaySection extends StatelessWidget {
  const AgendaDaySection({
    super.key,
    required this.date,
    required this.rows,
    required this.today,
    required this.onEventSelected,
    required this.showClubName,
    required this.dayLabelBottomGap,
  });

  final DateTime date;
  final List<EventAgendaRow> rows;
  final DateTime today;
  final ValueChanged<Event>? onEventSelected;
  final bool showClubName;
  final double dayLabelBottomGap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          eventDateRailDayLabel(date, today).toUpperCase(),
          variant: CatchTextVariant.statusLabel,
          color: DateUtils.isSameDay(date, today) ? t.primary : t.ink3,
        ),
        SizedBox(height: dayLabelBottomGap),
        for (var eventIndex = 0; eventIndex < rows.length; eventIndex++) ...[
          Builder(
            builder: (context) {
              final row = rows[eventIndex];
              final event = row.event;
              final status =
                  row.status ?? eventTileStatusForBadge(row.badgeLabel);
              return EventAgendaTile(
                data: EventTileData.fromEvent(
                  event: event,
                  status: status,
                  clubName: row.clubName,
                ),
                showClubName: showClubName,
                badgeLabel: row.badgeLabel,
                stripPosition: eventDateRailCardStripPositionFor(
                  eventIndex,
                  rows.length,
                ),
                onTap: onEventSelected == null
                    ? null
                    : () => onEventSelected!(event),
              );
            },
          ),
        ],
      ],
    );
  }
}
