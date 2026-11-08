import 'package:catch_dating_app/contexts/live/parts/formats_person_row.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_stop_row.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The crawl board in board order: the stop the group is at in the
/// nights-out colour, with its clock, who is with the crawl and Move
/// everyone; the route as a timeline; the arrival groups; and who has not
/// joined yet, each with Message.
class HostFormatsCrawlBody extends StatelessWidget {
  const HostFormatsCrawlBody({
    super.key,
    required this.state,
    required this.now,
    required this.onMove,
    required this.onMessage,
    required this.onRetry,
  });

  final HostFormatsCrawlState state;

  /// The clock the stop the group is at reads from.
  final DateTime now;
  final VoidCallback onMove;
  final VoidCallback onMessage;
  final VoidCallback onRetry;

  /// Not here yet shows this many people; the note counts the rest.
  static const int missingShown = 5;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsCrawlStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsCrawlStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsCrawlStatus.noRoute:
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.route,
            title: l10n.hostFormatsCrawlNoRouteTitle,
            message: l10n.hostFormatsCrawlNoRouteBody,
          ),
        );
      case HostFormatsCrawlStatus.running:
        break;
    }
    final current = state.currentIndex(now);
    final stop = current < 0 ? null : state.stops[current];
    final next = state.nextStop(now);
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.nightsOut,
          child: CatchStack(
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                justify: CatchStackJustify.between,
                gap: CatchStackGap.g8,
                children: [
                  Flexible(
                    child: CatchText(
                      stop == null
                          ? l10n.hostFormatsCrawlBefore(
                              total: state.stops.length,
                            )
                          : l10n.hostFormatsCrawlKicker(
                              number: current + 1,
                              total: state.stops.length,
                              time: AppTimeFormatters.time(stop.startsAt),
                            ),
                      variant: CatchTextVariant.labelKicker,
                      maxLines: 1,
                    ),
                  ),
                  if (next != null)
                    CatchText(
                      l10n.hostFormatsCrawlLeave(
                        time: AppTimeFormatters.time(next.startsAt),
                      ),
                      variant: CatchTextVariant.labelKicker,
                      numeric: true,
                    ),
                ],
              ),
              CatchText(
                (stop ?? state.stops.first).stop.title,
                variant: CatchTextVariant.displayLg,
              ),
              CatchMeter(
                value: state.booked == 0 ? 0 : state.here.toDouble(),
                max: state.booked == 0 ? 1 : state.booked.toDouble(),
                label: l10n.hostFormatsCrawlWithUs(
                  here: state.here,
                  total: state.booked,
                ),
                showLabel: true,
              ),
              if (next != null)
                CatchButton(
                  key: const ValueKey<String>('formats-crawl-move'),
                  label: l10n.hostFormatsCrawlMove(stop: next.stop.title),
                  fullWidth: true,
                  onPressed: onMove,
                ),
            ],
          ),
        ),
        CatchSection(
          title: l10n.hostFormatsCrawlRoute,
          timeline: true,
          dividers: CatchSectionPlacement.none,
          children: [
            for (final (index, item) in state.stops.indexed)
              FormatsStopRow(
                key: ValueKey<String>('formats-stop-${item.stop.id}'),
                stop: item.stop,
                startsAt: item.startsAt,
                status: state.stopStatus(index, now),
                format: CatchFormat.nightsOut,
              ),
          ],
        ),
        if (state.groups.isNotEmpty)
          CatchSection(
            title: l10n.hostFormatsCrawlGroups,
            children: [
              for (final group in state.groups)
                CatchIndexRow(
                  key: ValueKey<String>('formats-group-${group.label}'),
                  title: group.label,
                  icon: CatchIcons.people,
                  onTap: null,
                  density: CatchIndexRowSize.compact,
                  status: l10n.hostFormatsCrawlGroupHere(
                    here: group.here,
                    total: group.total,
                  ),
                  statusTone: group.here >= group.total
                      ? CatchIndexRowTone.success
                      : CatchIndexRowTone.warning,
                ),
            ],
          ),
        CatchSection(
          title: l10n.hostFormatsCrawlNotHere,
          note: state.missing.length > missingShown
              ? l10n.hostFormatsCrawlNotHereMore(
                  count: state.missing.length - missingShown,
                )
              : null,
          empty: l10n.hostFormatsCrawlEveryoneHere,
          children: [
            for (final person in state.missing.take(missingShown))
              FormatsPersonRow(
                key: ValueKey<String>('formats-missing-${person.name}'),
                name: person.name,
                subtitle: person.group,
                action: CatchIndexRowAction(
                  label: l10n.hostFormatsMessage,
                  variant: CatchIndexRowActionVariant.primary,
                  onPressed: onMessage,
                ),
              ),
          ],
        ),
      ],
    );
  }
}
