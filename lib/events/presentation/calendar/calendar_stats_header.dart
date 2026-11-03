part of 'calendar_screen.dart';

class CalendarStatsHeader extends StatelessWidget {
  const CalendarStatsHeader({super.key, required this.summary});

  final CalendarEventSummary summary;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.pageBody.copyWith(
        top: CatchSpacing.micro2,
        bottom: CatchSpacing.s3,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: CatchLayout.maxContentWidth,
          ),
          child: CatchLegacySurface(
            padding: CatchInsets.tileContentCompact,
            radius: CatchRadius.md,
            borderRole: CatchBorderRole.separator,
            child: Row(
              children: [
                Expanded(
                  child: CatchMetricTile(
                    key: const ValueKey('calendar.stats.planned'),
                    label: context.l10n.eventsCalendarScreenLabelPlanned,
                    value: context.l10n.eventsCalendarScreenVisiblecopyLength(
                      length: summary.events.length,
                    ),
                  ),
                ),
                const CalendarStatDivider(),
                Expanded(
                  child: CatchMetricTile(
                    key: const ValueKey('calendar.stats.distance'),
                    label: context.l10n.eventsCalendarScreenLabelDistance,
                    value: context.l10n.eventsCalendarScreenVisiblecopyRoundKm(
                      round: summary.totalDistance.round(),
                    ),
                  ),
                ),
                const CalendarStatDivider(),
                Expanded(
                  child: CatchMetricTile(
                    key: const ValueKey('calendar.stats.next'),
                    label: context.l10n.eventsCalendarScreenLabelNext,
                    value: summary.nextEvent == null
                        ? context.l10n.eventsCalendarScreenVisiblecopyNone
                        : EventFormatters.time(summary.nextEvent!.startTime),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
