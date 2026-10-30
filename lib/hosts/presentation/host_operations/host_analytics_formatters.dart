part of '../host_operations_screen.dart';

String _metricLabel(BuildContext context, HostAnalyticsMetricCard metric) {
  return switch (metric.id) {
    HostAnalyticsMetricIds.combinedViews =>
      context.l10n.hostsHostAnalyticsLabelProfileAndEventViews,
    HostAnalyticsMetricIds.listingViews =>
      context.l10n.hostsHostAnalyticsLabelProfileViews,
    HostAnalyticsMetricIds.eventViews =>
      context.l10n.hostsHostAnalyticsLabelEventViews,
    HostAnalyticsMetricIds.bookings =>
      context.l10n.hostsHostAnalyticsLabelBookings,
    HostAnalyticsMetricIds.rosterGuests =>
      context.l10n.hostsHostAnalyticsLabelRosterGuests,
    HostAnalyticsMetricIds.attendanceRate =>
      context.l10n.hostsHostAnalyticsLabelAttendanceRate,
    HostAnalyticsMetricIds.rosterAttendanceRate =>
      context.l10n.hostsHostAnalyticsLabelRosterAttendanceRate,
    HostAnalyticsMetricIds.revenue =>
      context.l10n.hostsHostAnalyticsLabelRevenue,
    HostAnalyticsMetricIds.checkoutDropoff =>
      context.l10n.hostsHostAnalyticsLabelCheckoutDropOff,
    HostAnalyticsMetricIds.checkoutConversionRate =>
      context.l10n.hostsHostAnalyticsLabelCheckoutConversion,
    HostAnalyticsMetricIds.newReviews =>
      context.l10n.hostsHostAnalyticsLabelNewReviews,
    HostAnalyticsMetricIds.connections =>
      context.l10n.hostsHostAnalyticsLabelConnections,
    HostAnalyticsMetricIds.chats =>
      context.l10n.hostsHostAnalyticsLabelChatsStarted,
    HostAnalyticsMetricIds.eventSaves =>
      context.l10n.hostsHostAnalyticsLabelEventSaves,
    _ => metric.label,
  };
}

String? _deltaCaption(
  BuildContext context,
  HostAnalyticsMetricCard metric,
  HostOrganizerInsightsRangePreset rangePreset,
) {
  final previous = metric.previousValue;
  if (previous == null || previous == 0) return null;
  final delta = ((metric.value - previous) / previous) * 100;
  return context.l10n.hostsHostAnalyticsTextDirectionPercentVsPreviousPeriod(
    direction: delta >= 0 ? '↑' : '↓',
    percent: delta.abs().round(),
    period: _rangeLabel(context, rangePreset),
  );
}

String _rangeLabel(
  BuildContext context,
  HostOrganizerInsightsRangePreset rangePreset,
) {
  return switch (rangePreset) {
    HostOrganizerInsightsRangePreset.thirtyDays =>
      context.l10n.hostsHostAnalyticsLabel30Days,
    HostOrganizerInsightsRangePreset.ninetyDays =>
      context.l10n.hostsHostAnalyticsLabel90Days,
    HostOrganizerInsightsRangePreset.twelveMonths =>
      context.l10n.hostsHostAnalyticsLabel12Months,
  };
}

HostAnalyticsGranularity _granularityFor(
  HostOrganizerInsightsRangePreset rangePreset,
) {
  return switch (rangePreset) {
    HostOrganizerInsightsRangePreset.thirtyDays ||
    HostOrganizerInsightsRangePreset.ninetyDays => HostAnalyticsGranularity.week,
    HostOrganizerInsightsRangePreset.twelveMonths => HostAnalyticsGranularity.month,
  };
}

String _formatMetricValue(
  HostAnalyticsMetricCard metric, {
  required String currencyCode,
}) {
  return switch (metric.unit) {
    HostAnalyticsMetricUnit.percent => '${metric.value.round()}%',
    HostAnalyticsMetricUnit.moneyMinor => EventFormatters.priceInPaise(
      metric.value.round(),
      currencyCode: currencyCode,
    ),
    HostAnalyticsMetricUnit.rating =>
      metric.value <= 0 ? '—' : metric.value.toStringAsFixed(1),
    HostAnalyticsMetricUnit.count => HostCountFormatters.compact(
      metric.value.round(),
    ),
  };
}

String _analyticsEventStatusLabel(BuildContext context, String status) {
  return switch (status.trim().toLowerCase()) {
    'live' => context.l10n.hostsHostAnalyticsStatusLive,
    'active' => context.l10n.hostsHostAnalyticsStatusActive,
    'open' => context.l10n.hostsHostAnalyticsStatusOpen,
    'published' => context.l10n.hostsHostAnalyticsStatusPublished,
    'completed' => context.l10n.hostsHostAnalyticsStatusCompleted,
    'past' => context.l10n.hostsHostAnalyticsStatusPast,
    'draft' => context.l10n.hostsHostAnalyticsStatusDraft,
    'pending' => context.l10n.hostsHostAnalyticsStatusPending,
    'scheduled' => context.l10n.hostsHostAnalyticsStatusScheduled,
    'cancelled' || 'canceled' => context.l10n.hostsHostAnalyticsStatusCancelled,
    _ => _titleCaseIdentifier(status),
  };
}

String _titleCaseIdentifier(String value) {
  final normalized = value.trim();
  if (normalized.isEmpty || normalized == 'unknown') return '—';
  return normalized
      .split(RegExp(r'[_\-\s]+'))
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

String _trendBucketLabel(
  DateTime date,
  HostAnalyticsGranularity granularity,
  int index,
) {
  if (granularity == HostAnalyticsGranularity.month) {
    return AppTimeFormatters.shortMonth(date);
  }
  return index.isEven ? AppTimeFormatters.monthDay(date) : '';
}

String _trendDetailPeriod(DateTime date, HostAnalyticsGranularity granularity) {
  return granularity == HostAnalyticsGranularity.month
      ? AppTimeFormatters.longMonth(date)
      : AppTimeFormatters.shortDate(date);
}
