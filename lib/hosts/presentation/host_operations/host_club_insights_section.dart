part of '../host_operations_screen.dart';

class HostClubInsightsRefreshController {
  Future<void> Function()? _onRefresh;

  Future<void> refresh() => _onRefresh?.call() ?? Future<void>.value();

  void _attach(Future<void> Function() onRefresh) {
    _onRefresh = onRefresh;
  }

  void _detach(Future<void> Function() onRefresh) {
    if (identical(_onRefresh, onRefresh)) _onRefresh = null;
  }
}

class HostClubInsightsSection extends ConsumerStatefulWidget {
  const HostClubInsightsSection({
    super.key,
    required this.club,
    this.refreshController,
    this.onOpenEventReport,
    this.onOpenAllEvents,
    this.onOpenEventDefaults,
  });

  final Club club;
  final HostClubInsightsRefreshController? refreshController;
  final ValueChanged<String>? onOpenEventReport;
  final VoidCallback? onOpenAllEvents;
  final VoidCallback? onOpenEventDefaults;

  @override
  ConsumerState<HostClubInsightsSection> createState() =>
      _HostClubInsightsSectionState();
}

class _HostClubInsightsSectionState
    extends ConsumerState<HostClubInsightsSection> {
  late HostClubInsightsState _state;

  @override
  void initState() {
    super.initState();
    _state = HostClubInsightsState.initial(clubId: widget.club.id);
    widget.refreshController?._attach(_refresh);
  }

  @override
  void didUpdateWidget(covariant HostClubInsightsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    _state = _state.selectClub(widget.club.id);
    if (!identical(oldWidget.refreshController, widget.refreshController)) {
      oldWidget.refreshController?._detach(_refresh);
      widget.refreshController?._attach(_refresh);
    }
  }

  @override
  void dispose() {
    widget.refreshController?._detach(_refresh);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fallbackTimezone = marketForCityName(widget.club.location).timeZone;
    final timezone =
        ref.watch(hostAnalyticsDeviceTimezoneProvider).value ??
        fallbackTimezone;
    final query = _hostAnalyticsQueryFor(_state.query, timezone: timezone);
    final analyticsAsync = ref.watch(hostAnalyticsProvider(query));
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        HostAnalyticsPeriodInput(
          selected: _state.rangePreset,
          onChanged: (preset) =>
              setState(() => _state = _state.selectRange(preset)),
        ),
        CatchAsyncBoundary<HostAnalyticsReport>(
          value: analyticsAsync,
          onRetry: () => ref.invalidate(hostAnalyticsProvider(query)),
          loadingBuilder: (_) => CatchSection.content(
            child: const HostAnalyticsReportLoadingIndicator(),
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) => CatchSection.content(
            child: CatchLocalizedErrorState(
              error,
              context: AppErrorContext.club,
              onRetry: onBoundaryRetry,
            ),
          ),
          builder: (context, report) => HostAnalyticsReportBody(
            report: report,
            rangePreset: _state.rangePreset,
            currencyCode: currencyCodeForCityName(widget.club.location),
            onOpenEventReport: widget.onOpenEventReport ?? _openEventReport,
            onOpenAllEvents:
                widget.onOpenAllEvents ??
                () => context.goNamed(Routes.hostEventsScreen.name),
            onOpenEventDefaults:
                widget.onOpenEventDefaults ??
                () => context.pushNamed(
                  Routes.hostClubEventDefaultsScreen.name,
                  queryParameters: {'clubId': widget.club.id},
                ),
          ),
        ),
        HostTrackingSettingsSection(organizerId: widget.club.id),
        HostClubOrganizerSectionList(club: widget.club),
      ],
    );
  }

  Future<void> _refresh() async {
    final fallbackTimezone = marketForCityName(widget.club.location).timeZone;
    final timezone =
        await ref.read(hostAnalyticsDeviceTimezoneProvider.future) ??
        fallbackTimezone;
    final query = _hostAnalyticsQueryFor(_state.query, timezone: timezone);
    ref.invalidate(hostAnalyticsProvider(query));
    await ref.read(hostAnalyticsProvider(query).future);
  }

  void _openEventReport(String eventId) {
    context.pushNamed(
      Routes.hostAppEventManageScreen.name,
      pathParameters: {'clubId': widget.club.id, 'eventId': eventId},
      queryParameters: const {'section': 'report'},
    );
  }
}

enum HostAnalyticsCoachRecommendationKind {
  attendance,
  checkoutDropoff,
  demandCapacity,
  noRepeatAttendees,
}

class HostAnalyticsCoachRecommendation {
  const HostAnalyticsCoachRecommendation({
    required this.kind,
    this.eventId,
    this.eventTitle,
  });

  final HostAnalyticsCoachRecommendationKind kind;
  final String? eventId;
  final String? eventTitle;
}

const hostAnalyticsCoachAttendanceThreshold = 60;
const hostAnalyticsCoachCheckoutDropoffThreshold = 0.30;
const hostAnalyticsCoachDemandMultiplier = 2;
const hostAnalyticsCoachMaximumRecommendations = 2;

List<HostAnalyticsCoachRecommendation> hostAnalyticsCoachRecommendations(
  HostAnalyticsReport report,
) {
  final recommendations = <HostAnalyticsCoachRecommendation>[];
  final events = report.topEvents;
  HostAnalyticsMetricCard? attendance;
  for (final card in report.summaryCards) {
    if (card.id == HostAnalyticsMetricIds.attendanceRate) {
      attendance = card;
      break;
    }
  }

  void add(HostAnalyticsCoachRecommendation recommendation) {
    if (recommendations.length < hostAnalyticsCoachMaximumRecommendations) {
      recommendations.add(recommendation);
    }
  }

  if (events.length >= 2 &&
      attendance != null &&
      attendance.value < hostAnalyticsCoachAttendanceThreshold) {
    add(
      HostAnalyticsCoachRecommendation(
        kind: HostAnalyticsCoachRecommendationKind.attendance,
        eventId: events.first.eventId,
        eventTitle: events.first.title,
      ),
    );
  }

  final checkoutStarted = _trendMetricTotal(
    report,
    HostAnalyticsTrendKeys.checkoutStarted,
  );
  final checkoutDropoff = _trendMetricTotal(
    report,
    HostAnalyticsTrendKeys.checkoutDropoff,
  );
  if (checkoutStarted > 0 &&
      checkoutDropoff / checkoutStarted >=
          hostAnalyticsCoachCheckoutDropoffThreshold) {
    add(
      const HostAnalyticsCoachRecommendation(
        kind: HostAnalyticsCoachRecommendationKind.checkoutDropoff,
      ),
    );
  }

  for (final event in events) {
    if (event.demandCount > 0 &&
        event.demandCount >=
            hostAnalyticsCoachDemandMultiplier * event.bookedCount) {
      add(
        HostAnalyticsCoachRecommendation(
          kind: HostAnalyticsCoachRecommendationKind.demandCapacity,
          eventId: event.eventId,
          eventTitle: event.title,
        ),
      );
      break;
    }
  }

  // The callable caps recent events at 25. Avoid claiming there were no repeat
  // attendees when the range may contain events outside that visible slice.
  if (events.length >= 3 &&
      events.length < 25 &&
      events.every((event) => event.repeatAttendeeCount == 0)) {
    add(
      const HostAnalyticsCoachRecommendation(
        kind: HostAnalyticsCoachRecommendationKind.noRepeatAttendees,
      ),
    );
  }

  return recommendations;
}

num _trendMetricTotal(HostAnalyticsReport report, String key) {
  return report.trend.fold<num>(
    0,
    (total, point) => total + (point.metrics[key] ?? 0),
  );
}

HostAnalyticsQuery _hostAnalyticsQueryFor(
  HostClubInsightsQueryState state, {
  required String timezone,
}) {
  return HostAnalyticsQuery(
    clubId: state.clubId,
    rangePreset: switch (state.rangePreset) {
      HostClubInsightsRangePreset.thirtyDays =>
        HostAnalyticsRangePreset.thirtyDays,
      HostClubInsightsRangePreset.ninetyDays =>
        HostAnalyticsRangePreset.ninetyDays,
      HostClubInsightsRangePreset.twelveMonths =>
        HostAnalyticsRangePreset.twelveMonths,
    },
    granularity: switch (state.rangePreset) {
      HostClubInsightsRangePreset.thirtyDays ||
      HostClubInsightsRangePreset.ninetyDays => HostAnalyticsGranularity.week,
      HostClubInsightsRangePreset.twelveMonths =>
        HostAnalyticsGranularity.month,
    },
    timezone: timezone,
  );
}

class HostAnalyticsReportBody extends StatefulWidget {
  const HostAnalyticsReportBody({
    super.key,
    required this.report,
    required this.rangePreset,
    required this.currencyCode,
    required this.onOpenEventReport,
    required this.onOpenAllEvents,
    required this.onOpenEventDefaults,
    this.now,
  });

  final HostAnalyticsReport report;
  final HostClubInsightsRangePreset rangePreset;
  final String currencyCode;
  final ValueChanged<String> onOpenEventReport;
  final VoidCallback onOpenAllEvents;
  final VoidCallback onOpenEventDefaults;
  final DateTime? now;

  @override
  State<HostAnalyticsReportBody> createState() =>
      _HostAnalyticsReportBodyState();
}

class _HostAnalyticsReportBodyState extends State<HostAnalyticsReportBody> {
  bool _moreMetricsOpen = false;

  @override
  Widget build(BuildContext context) {
    final primaryMetrics = _primaryMetricCards(widget.report);
    final secondaryMetrics = _secondaryMetricCards(widget.report);
    final coachRecommendations = hostAnalyticsCoachRecommendations(
      widget.report,
    );
    final showSyncFootnote =
        widget.report.dataQuality.any(
          (row) => row.state != HostAnalyticsDataQualityState.ok,
        ) ||
        widget.report.summaryCards.any(
          (card) => card.status != HostAnalyticsMetricStatus.ready,
        );

    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.content(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(
                context.l10n.hostsHostAnalyticsTextUpdatedRelative(
                  relative: AppTimeFormatters.compactRelativeTime(
                    widget.report.generatedAt,
                    now: widget.now,
                  ),
                ),
                variant: CatchTextVariant.supporting,
                color: CatchTokens.of(context).ink3,
              ),
              if (showSyncFootnote) ...[
                gapH4,
                CatchText(
                  context
                      .l10n
                      .hostsHostAnalyticsTextSomeDataIsStillSyncingNumbersMayUpdate,
                  key: const ValueKey('host-analytics-sync-footnote'),
                  variant: CatchTextVariant.supporting,
                  color: CatchTokens.of(context).warning,
                ),
              ],
            ],
          ),
        ),
        CatchSection.content(
          title: context.l10n.hostsHostAnalyticsLabelPerformance,
          child: Column(
            children: [
              CatchMetricSection.dataQuality(
                key: const ValueKey('host-analytics-primary-grid'),
                metrics: [
                  for (final metric in primaryMetrics)
                    _hostMetricCardData(
                      context,
                      metric,
                      rangePreset: widget.rangePreset,
                      currencyCode: widget.currencyCode,
                    ),
                ],
              ),
            ],
          ),
        ),
        CatchSection.rows(
          children: [
            // Composite exception: the disclosure reveals a complete
            // secondary analytics grid, not a scalar field choice.
            CatchField.control(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-analytics-more-metrics'),
              title: context.l10n.hostsHostAnalyticsLabelMoreMetrics,
              contractExemption:
                  'Disclosure-only analytics layout; no editable value is '
                  'submitted or persisted.',
              body: context.l10n.hostsHostAnalyticsBodyCheckoutChatsAndSaves,
              disclosureMode: _moreMetricsOpen
                  ? CatchFieldMode.controlledExpanded
                  : CatchFieldMode.controlledCollapsed,
              onOpenChanged: (open) {
                setState(() => _moreMetricsOpen = open);
              },
              child: CatchMetricSection.dataQuality(
                key: const ValueKey('host-analytics-secondary-grid'),
                metrics: [
                  for (final metric in secondaryMetrics)
                    _hostMetricCardData(
                      context,
                      metric,
                      rangePreset: widget.rangePreset,
                      currencyCode: widget.currencyCode,
                    ),
                ],
              ),
            ),
          ],
        ),
        HostAnalyticsPresenceSection(report: widget.report),
        HostAnalyticsObservedStagesSection(report: widget.report),
        HostAnalyticsTrendSection(
          points: widget.report.trend,
          granularity: _granularityFor(widget.rangePreset),
        ),
        if (coachRecommendations.isNotEmpty)
          CatchSection.rows(
            title: context.l10n.hostsHostAnalyticsTitleCoach,
            children: [
              for (final recommendation in coachRecommendations)
                switch (recommendation.kind) {
                  HostAnalyticsCoachRecommendationKind.attendance =>
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('host-analytics-coach-attendance'),
                      title: context.l10n.hostsHostAnalyticsCoachAttendance,
                      titleMaxLines: 3,
                      onTap: () =>
                          widget.onOpenEventReport(recommendation.eventId!),
                    ),
                  HostAnalyticsCoachRecommendationKind.checkoutDropoff =>
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey(
                        'host-analytics-coach-checkout-dropoff',
                      ),
                      title:
                          context.l10n.hostsHostAnalyticsCoachCheckoutDropoff,
                      titleMaxLines: 3,
                      onTap: widget.onOpenEventDefaults,
                    ),
                  HostAnalyticsCoachRecommendationKind.demandCapacity =>
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey(
                        'host-analytics-coach-demand-capacity',
                      ),
                      title: context.l10n.hostsHostAnalyticsCoachDemandCapacity(
                        event: recommendation.eventTitle!,
                      ),
                      titleMaxLines: 3,
                      onTap: () =>
                          widget.onOpenEventReport(recommendation.eventId!),
                    ),
                  HostAnalyticsCoachRecommendationKind.noRepeatAttendees =>
                    CatchField.read(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey(
                        'host-analytics-coach-no-repeat-attendees',
                      ),
                      title:
                          context.l10n.hostsHostAnalyticsCoachNoRepeatAttendees,
                      titleMaxLines: 3,
                    ),
                },
            ],
          ),
        HostAnalyticsEventList(
          events: widget.report.topEvents,
          onOpenEventReport: widget.onOpenEventReport,
          onOpenAllEvents: widget.onOpenAllEvents,
        ),
        HostAnalyticsReviewsSection(report: widget.report),
      ],
    );
  }
}

class HostAnalyticsEventList extends StatelessWidget {
  const HostAnalyticsEventList({
    super.key,
    required this.events,
    required this.onOpenEventReport,
    required this.onOpenAllEvents,
  });
  final List<HostAnalyticsEventRow> events;
  final ValueChanged<String> onOpenEventReport;
  final VoidCallback onOpenAllEvents;

  @override
  Widget build(BuildContext context) => CatchSection.rows(
    title: context.l10n.hostsHostAnalyticsLabelRecentEvents,
    children: [
      if (events.isEmpty)
        CatchField.read(
          content: CatchRecordLayout(
            title: context.l10n.hostsHostAnalyticsTextNoEventsInThis,
            icon: CatchIcons.eventOutlined,
          ),
        ),
      for (final event in events.take(5))
        CatchField.navigate(
          key: ValueKey('host-analytics-event-${event.eventId}'),
          content: hostAnalyticsEventLayout(context, event),
          onActivate: () => onOpenEventReport(event.eventId),
        ),
      CatchField.navigate(
        content: CatchRecordLayout(
          title: context.l10n.hostsHostAnalyticsLabelAllEvents,
          icon: CatchIcons.calendarMonthOutlined,
        ),
        onActivate: onOpenAllEvents,
      ),
    ],
  );
}

CatchRecordLayout hostAnalyticsEventLayout(
  BuildContext context,
  HostAnalyticsEventRow event,
) => CatchRecordLayout(
  title: event.title,
  icon: CatchIcons.eventOutlined,
  metadata: context.l10n.hostsHostAnalyticsTextEventDateStatus(
    date: EventFormatters.shortDate(event.startTime),
    status: _analyticsEventStatusLabel(context, event.status),
  ),
  facts: [
    event.operationalAttendeeCount > 0
        ? context.l10n.hostsHostAnalyticsTextRosterAttendedExternal(
            roster: event.operationalAttendeeCount,
            attended: event.operationalCheckedInCount,
            external: event.externalAttendeeCount,
          )
        : context.l10n.hostsHostAnalyticsTextBookedAttendedMatches(
            booked: event.bookedCount,
            attended: event.checkedInCount,
            matches: event.mutualMatchCount,
          ),
    EventFormatters.priceInPaise(
      event.grossRevenueMinor,
      currencyCode: event.currency,
    ),
    if (event.paymentFailedCount > 0 || event.checkoutDropoffCount > 0)
      context.l10n.hostsHostAnalyticsLabelPaymentIssues,
  ],
);

class HostAnalyticsReviewsSection extends StatelessWidget {
  const HostAnalyticsReviewsSection({super.key, required this.report});

  final HostAnalyticsReport report;

  @override
  Widget build(BuildContext context) => CatchSection.content(
    title: context.l10n.hostsHostAnalyticsLabelReviews,
    child: CatchMetricSection.grid(
      items: [
        CatchMetricValue(
          label: context.l10n.hostsHostAnalyticsLabelNewReviews,
          value: HostCountFormatters.compact(report.reviewSummary.newReviews),
        ),
        CatchMetricValue(
          label: context.l10n.hostsHostAnalyticsLabelAverageRating,
          value: report.reviewSummary.averageRating <= 0
              ? '—'
              : report.reviewSummary.averageRating.toStringAsFixed(1),
        ),
        CatchMetricValue(
          label: context.l10n.hostsHostAnalyticsLabelPublishedReviews,
          value: HostCountFormatters.compact(
            report.reviewSummary.publishedReviews,
          ),
        ),
        CatchMetricValue(
          label: context.l10n.hostsHostAnalyticsLabelResponses,
          value: HostCountFormatters.compact(
            report.reviewSummary.ownerResponseCount,
          ),
        ),
      ],
    ),
  );
}

List<HostAnalyticsMetricCard> _primaryMetricCards(HostAnalyticsReport report) {
  final cards = {for (final card in report.summaryCards) card.id: card};
  final listing = cards[HostAnalyticsMetricIds.listingViews];
  final events = cards[HostAnalyticsMetricIds.eventViews];
  final views = HostAnalyticsMetricCard(
    id: HostAnalyticsMetricIds.combinedViews,
    label: '',
    value: (listing?.value ?? 0) + (events?.value ?? 0),
    unit: HostAnalyticsMetricUnit.count,
    status: _combinedMetricStatus(listing?.status, events?.status),
    previousValue:
        listing?.previousValue == null || events?.previousValue == null
        ? null
        : listing!.previousValue! + events!.previousValue!,
  );
  return [
    views,
    cards[HostAnalyticsMetricIds.rosterGuests] ??
        _metricOrMissing(cards, HostAnalyticsMetricIds.bookings),
    cards[HostAnalyticsMetricIds.rosterAttendanceRate] ??
        _metricOrMissing(
          cards,
          HostAnalyticsMetricIds.attendanceRate,
          unit: HostAnalyticsMetricUnit.percent,
        ),
    _metricOrMissing(
      cards,
      HostAnalyticsMetricIds.revenue,
      unit: HostAnalyticsMetricUnit.moneyMinor,
    ),
    _metricOrMissing(cards, HostAnalyticsMetricIds.connections),
    _metricOrMissing(cards, HostAnalyticsMetricIds.newReviews),
  ];
}

List<HostAnalyticsMetricCard> _secondaryMetricCards(
  HostAnalyticsReport report,
) {
  final cards = {for (final card in report.summaryCards) card.id: card};
  return [
    _metricOrMissing(cards, HostAnalyticsMetricIds.checkoutDropoff),
    _metricOrMissing(
      cards,
      HostAnalyticsMetricIds.checkoutConversionRate,
      unit: HostAnalyticsMetricUnit.percent,
    ),
    _metricOrMissing(cards, HostAnalyticsMetricIds.chats),
    HostAnalyticsMetricCard(
      id: HostAnalyticsMetricIds.eventSaves,
      label: '',
      value: report.discoverySummary.eventSaves,
      unit: HostAnalyticsMetricUnit.count,
      status:
          report.dataQuality.any(
            (row) => row.state == HostAnalyticsDataQualityState.missing,
          )
          ? HostAnalyticsMetricStatus.missing
          : HostAnalyticsMetricStatus.ready,
    ),
  ];
}

HostAnalyticsMetricCard _metricOrMissing(
  Map<String, HostAnalyticsMetricCard> cards,
  String id, {
  HostAnalyticsMetricUnit unit = HostAnalyticsMetricUnit.count,
}) {
  return cards[id] ??
      HostAnalyticsMetricCard(
        id: id,
        label: '',
        value: 0,
        unit: unit,
        status: HostAnalyticsMetricStatus.missing,
      );
}

HostAnalyticsMetricStatus _combinedMetricStatus(
  HostAnalyticsMetricStatus? first,
  HostAnalyticsMetricStatus? second,
) {
  if (first == HostAnalyticsMetricStatus.missing ||
      second == HostAnalyticsMetricStatus.missing ||
      first == null ||
      second == null) {
    return HostAnalyticsMetricStatus.missing;
  }
  if (first == HostAnalyticsMetricStatus.partial ||
      second == HostAnalyticsMetricStatus.partial) {
    return HostAnalyticsMetricStatus.partial;
  }
  return HostAnalyticsMetricStatus.ready;
}

IconData _metricIcon(String metricId) {
  return switch (metricId) {
    HostAnalyticsMetricIds.listingViews ||
    HostAnalyticsMetricIds.eventViews ||
    HostAnalyticsMetricIds.combinedViews => CatchIcons.visibilityOutlined,
    HostAnalyticsMetricIds.bookings => CatchIcons.confirmationNumberOutlined,
    HostAnalyticsMetricIds.rosterGuests => CatchIcons.groupsOutlined,
    HostAnalyticsMetricIds.attendanceRate => CatchIcons.factCheckOutlined,
    HostAnalyticsMetricIds.rosterAttendanceRate => CatchIcons.factCheckOutlined,
    HostAnalyticsMetricIds.revenue => CatchIcons.accountBalanceWalletOutlined,
    HostAnalyticsMetricIds.checkoutDropoff ||
    HostAnalyticsMetricIds.checkoutConversionRate =>
      CatchIcons.paymentsOutlined,
    HostAnalyticsMetricIds.newReviews => CatchIcons.rateReviewOutlined,
    HostAnalyticsMetricIds.connections => CatchIcons.favoriteOutlineRounded,
    HostAnalyticsMetricIds.chats => CatchIcons.chatBubbleOutlineRounded,
    HostAnalyticsMetricIds.eventSaves => CatchIcons.bookmarkBorderRounded,
    _ => CatchIcons.insightsOutlined,
  };
}

CatchMetricData _hostMetricCardData(
  BuildContext context,
  HostAnalyticsMetricCard metric, {
  required HostClubInsightsRangePreset rangePreset,
  required String currencyCode,
}) {
  return CatchMetricData(
    icon: _metricIcon(metric.id),
    value: _formatMetricValue(metric, currencyCode: currencyCode),
    label: _metricLabel(context, metric),
    caption: _deltaCaption(context, metric, rangePreset),
    partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
    missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
    status: switch (metric.status) {
      HostAnalyticsMetricStatus.ready => CatchMetricDataStatus.ready,
      HostAnalyticsMetricStatus.partial => CatchMetricDataStatus.partial,
      HostAnalyticsMetricStatus.missing => CatchMetricDataStatus.missing,
    },
  );
}
