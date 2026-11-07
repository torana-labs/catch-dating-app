import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_event_review_row.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The event report in board order: when it was and how it went, the four
/// stats, the pairs who want to stay in touch, what guests said, the
/// spotlight that brings the guests back to the next event, and the
/// downloads.
class HostEventReportBody extends StatelessWidget {
  const HostEventReportBody({
    super.key,
    required this.state,
    required this.onAllReviews,
    required this.onInviteAll,
    required this.onChoose,
    required this.onDownload,
  });

  final HostEventReportState state;
  final VoidCallback onAllReviews;
  final VoidCallback onInviteAll;
  final VoidCallback onChoose;
  final ValueChanged<HostEventReportDownload> onDownload;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = state.event;
    final header = CatchStack(
      gap: CatchStackGap.g6,
      children: [
        CatchText(
          l10n.hostEventReportWhen(
            date: EventFormatters.longDate(event.startTime),
            start: EventFormatters.time(event.startTime),
            end: EventFormatters.time(event.endTime),
          ),
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        CatchText(event.title, variant: CatchTextVariant.pageTitle),
        CatchText(l10n.hostEventReportHowItWent, tone: CatchTextTone.secondary),
      ],
    );
    if (state.status == HostEventReportStatus.loading) {
      return CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.section,
          children: [
            header,
            const CatchSkeleton.content(child: _HostEventReportStats()),
          ],
        ),
      );
    }

    final came = state.came;
    final stayInTouch = state.stayInTouch;
    final next = state.nextEvent;
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          header,
          _HostEventReportStats(state: state),
          if (stayInTouch != null)
            CatchSurface(
              key: const ValueKey<String>('host-event-report-stay-in-touch'),
              child: CatchStack(
                direction: CatchStackDirection.row,
                align: CatchStackAlign.center,
                children: [
                  if (state.people.isNotEmpty)
                    CatchAvatarRow(
                      items: [
                        for (final name in state.people)
                          CatchPersonAvatarItem(name: name),
                      ],
                      limit: 3,
                      showOverflowCount: false,
                      countLabelBuilder: (count) =>
                          l10n.hostEventReportMoreFaces(count: count),
                    ),
                  Expanded(
                    child: CatchStack(
                      gap: CatchStackGap.g2,
                      children: [
                        CatchText(
                          l10n.hostEventReportStayInTouchTitle(
                            count: stayInTouch,
                          ),
                          variant: CatchTextVariant.titleRow,
                        ),
                        CatchText(
                          l10n.hostEventReportStayInTouchBody,
                          variant: CatchTextVariant.bodySmall,
                          tone: CatchTextTone.secondary,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          CatchSection(
            title: l10n.hostEventReportReviewsTitle,
            action: state.reviewCount > state.reviews.length
                ? CatchSectionAction(
                    label: l10n.hostEventReportAllReviews(
                      count: state.reviewCount,
                    ),
                    onPressed: onAllReviews,
                  )
                : null,
            empty: l10n.hostEventReportReviewsEmpty,
            children: [
              for (final review in state.reviews)
                HostEventReviewRow(
                  key: ValueKey<String>(
                    'host-event-report-review-${review.id}',
                  ),
                  review: review,
                ),
            ],
          ),
          if (next != null && came != null && came > 0)
            CatchSurface(
              key: const ValueKey<String>('host-event-report-bring-back'),
              block: CatchSurfaceBlock.spotlight,
              color: _spotlightColor(state.format),
              child: CatchStack(
                children: [
                  CatchText(
                    next.capacityLimit > 0
                        ? l10n.hostEventReportNextPlaces(
                            day: EventFormatters.longWeekday(next.startTime),
                            places: next.capacityLimit,
                          )
                        : EventFormatters.longWeekday(next.startTime),
                    variant: CatchTextVariant.labelKicker,
                    tone: CatchTextTone.secondary,
                  ),
                  CatchText(
                    l10n.hostEventReportBringBackTitle(
                      count: came,
                      when: state.tonight ? 'tonight' : 'other',
                    ),
                    variant: CatchTextVariant.displaySm,
                  ),
                  CatchText(
                    l10n.hostEventReportBringBackBody(event: next.title),
                  ),
                  CatchStack(
                    direction: CatchStackDirection.row,
                    gap: CatchStackGap.g8,
                    wrap: true,
                    children: [
                      CatchButton(
                        label: l10n.hostEventReportInviteAll(count: came),
                        size: CatchButtonSize.md,
                        onPressed: onInviteAll,
                      ),
                      CatchButton(
                        label: l10n.hostEventReportChoose,
                        variant: CatchButtonVariant.quiet,
                        size: CatchButtonSize.md,
                        onPressed: onChoose,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          CatchSection(
            title: l10n.hostEventReportDownloadsTitle,
            children: [
              for (final download in HostEventReportDownload.values)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-event-report-download-${download.name}',
                  ),
                  icon: CatchIcons.download,
                  title: switch (download) {
                    HostEventReportDownload.guestList =>
                      l10n.hostEventReportDownloadGuestList,
                    HostEventReportDownload.payments =>
                      l10n.hostEventReportDownloadPayments,
                  },
                  value: l10n.hostEventReportDownloadCsv,
                  onTap: () => onDownload(download),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The four stats two to a row: Came, Ticket sales, New faces and Rating.
class _HostEventReportStats extends StatelessWidget {
  const _HostEventReportStats({this.state});

  /// Null draws the loading shape.
  final HostEventReportState? state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = this.state;
    final walkIns = state?.walkIns;
    final payments = state?.payments;
    final ratingCount = state?.ratingCount ?? 0;
    Widget row(List<Widget> children) => CatchStack(
      direction: CatchStackDirection.row,
      equal: true,
      children: children,
    );
    return CatchStack(
      children: [
        row([
          HostAnalyticsMetricTile(
            label: l10n.hostEventReportCame,
            value: state?.came,
            note: walkIns == null
                ? null
                : walkIns > 0
                ? l10n.hostEventReportMoreThanBooked(count: walkIns)
                : l10n.hostEventReportOfBooked(booked: state?.booked ?? 0),
            noteTone: walkIns != null && walkIns > 0
                ? CatchMetricTileTone.success
                : CatchMetricTileTone.secondary,
          ),
          HostAnalyticsMetricTile(
            label: l10n.hostTodayStatTicketSales,
            value: state?.ticketSalesMinor,
            currencyCode: state?.currencyCode,
            figure: HostAnalyticsFigure.moneyExact,
            note: payments == null || payments <= 0
                ? null
                : l10n.hostEventReportPayments(count: payments),
          ),
        ]),
        row([
          HostAnalyticsMetricTile(
            label: l10n.hostTodayCountNewFaces,
            value: state?.newFaces,
            note: state?.newFaces == null
                ? null
                : l10n.hostEventReportFirstTime,
            noteTone: CatchMetricTileTone.success,
          ),
          HostAnalyticsMetricTile(
            label: l10n.hostEventReportRating,
            value: state?.rating,
            figure: HostAnalyticsFigure.rating,
            note: state == null
                ? null
                : ratingCount > 0
                ? l10n.hostEventReportRatedBy(count: ratingCount)
                : l10n.hostEventReportNotRated,
          ),
        ]),
      ],
    );
  }
}

CatchSurfaceColor _spotlightColor(CatchFormat? format) => switch (format) {
  CatchFormat.run => CatchSurfaceColor.run,
  CatchFormat.dinner => CatchSurfaceColor.dinner,
  CatchFormat.games => CatchSurfaceColor.games,
  CatchFormat.courts => CatchSurfaceColor.courts,
  CatchFormat.nightsOut => CatchSurfaceColor.nightsOut,
  null => CatchSurfaceColor.ink,
};
