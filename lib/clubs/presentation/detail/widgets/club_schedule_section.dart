import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ClubScheduleSection extends StatelessWidget {
  const ClubScheduleSection({
    super.key,
    required this.events,
    this.isHost = false,
    this.onEventSelected,
    this.bottomPadding = CatchLayout.detailScreenBottomPadding,
  });

  final List<Event> events;
  final bool isHost;
  final ValueChanged<Event>? onEventSelected;
  final double bottomPadding;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final today = DateTime.now();
    final groupedRows = groupEventDateRailItems(
      [
        for (final event in events)
          _ClubScheduleRow(
            event: event,
            badgeLabel: isHost
                ? context.l10n.clubsClubScheduleHostedBadge
                : context.l10n.clubsClubScheduleViewBadge,
            status: isHost ? EventTileStatus.hosted : EventTileStatus.open,
          ),
      ],
      startTimeOf: (row) => row.event.startTime,
    ).entries.toList(growable: false);

    return SliverMainAxisGroup(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
            CatchLayout.detailScreenHorizontalPadding,
            0,
            CatchLayout.detailScreenHorizontalPadding,
            0,
          ),
          sliver: SliverToBoxAdapter(
            child: CatchSection.divided(
              title: context.l10n.clubsClubScheduleSectionTitleSchedule,
              child: const SizedBox.shrink(),
            ),
          ),
        ),
        if (events.isEmpty)
          SliverPadding(
            padding: EdgeInsets.fromLTRB(
              CatchLayout.detailScreenHorizontalPadding,
              0,
              CatchLayout.detailScreenHorizontalPadding,
              bottomPadding,
            ),
            sliver: SliverToBoxAdapter(
              child: CatchEmptyState(
                icon: CatchIcons.calendarMonthOutlined,
                title:
                    context.l10n.clubsClubScheduleSectionTitleNoEventsScheduled,
                message: context
                    .l10n
                    .clubsClubScheduleSectionMessageFutureEventsWillAppear,
                variant: CatchEmptyStateVariant.inline,
              ),
            ),
          )
        else
          SliverPadding(
            padding: EdgeInsets.fromLTRB(
              CatchLayout.detailScreenHorizontalPadding,
              0,
              CatchLayout.detailScreenHorizontalPadding,
              bottomPadding,
            ),
            sliver: SliverList.list(
              children: [
                for (
                  var groupIndex = 0;
                  groupIndex < groupedRows.length;
                  groupIndex++
                ) ...[
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CatchText(
                        eventDateRailDayLabel(
                          groupedRows[groupIndex].key,
                          today,
                        ).toUpperCase(),
                        variant: CatchTextVariant.statusLabel,
                        color:
                            DateUtils.isSameDay(
                              groupedRows[groupIndex].key,
                              today,
                            )
                            ? t.primary
                            : t.ink3,
                      ),
                      const SizedBox(
                        height: CatchLayout.agendaDayLabelBottomGap,
                      ),
                      for (
                        var eventIndex = 0;
                        eventIndex < groupedRows[groupIndex].value.length;
                        eventIndex++
                      ) ...[
                        Builder(
                          builder: (context) {
                            final row =
                                groupedRows[groupIndex].value[eventIndex];
                            final data = EventTileData.fromEvent(
                              event: row.event,
                              status: row.status,
                            );
                            return EventDateRailCard(
                              key: ValueKey<String>(
                                'club-schedule-event-${row.event.id}',
                              ),
                              event: row.event,
                              kicker: eventTileKickerLabel(
                                data,
                                showClubName: false,
                              ),
                              supportingLabel: eventTileSupportingLabel(
                                data,
                                showClubName: false,
                              ),
                              priceLabel: eventPriceLabel(
                                context.l10n,
                                data.event,
                              ),
                              statusLabel: eventTileCardStatusLabel(
                                row.status,
                                context.l10n,
                                label: row.badgeLabel,
                              ),
                              stripPosition: eventDateRailCardStripPositionFor(
                                eventIndex,
                                groupedRows[groupIndex].value.length,
                              ),
                              onTap: onEventSelected == null
                                  ? null
                                  : () => onEventSelected!(row.event),
                            );
                          },
                        ),
                      ],
                    ],
                  ),
                  if (groupIndex < groupedRows.length - 1)
                    const SizedBox(height: CatchLayout.agendaGroupGap),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _ClubScheduleRow {
  const _ClubScheduleRow({
    required this.event,
    required this.badgeLabel,
    required this.status,
  });

  final Event event;
  final String badgeLabel;
  final EventTileStatus status;
}
