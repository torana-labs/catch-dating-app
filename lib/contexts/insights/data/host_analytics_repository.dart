import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart' show DateUtils;
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_analytics_repository.g.dart';

// keepalive: the device IANA timezone is stable for the app process and lets
// host surfaces render from their market fallback while the plugin resolves.
@Riverpod(keepAlive: true)
Future<String?> hostAnalyticsDeviceTimezone(Ref ref) async {
  try {
    final timezone = (await FlutterTimezone.getLocalTimezone()).identifier;
    final normalized = timezone.trim();
    return normalized.isEmpty ? null : normalized;
  } on Object {
    return null;
  }
}

enum HostAnalyticsRangePreset {
  sevenDays('7d', '7 days'),
  thirtyDays('30d', '30 days'),
  ninetyDays('90d', '90 days'),
  twelveMonths('12m', '12 months'),
  month('month', 'This month'),
  custom('custom', 'Custom');

  const HostAnalyticsRangePreset(this.wireValue, this.label);

  final String wireValue;
  final String label;
}

enum HostAnalyticsGranularity {
  day('day', 'Day'),
  week('week', 'Week'),
  month('month', 'Month');

  const HostAnalyticsGranularity(this.wireValue, this.label);

  final String wireValue;
  final String label;
}

enum HostAnalyticsMetricUnit { count, percent, moneyMinor, rating }

enum HostAnalyticsMetricStatus { ready, partial, missing }

enum HostAnalyticsDataQualityState { ok, partial, missing }

/// Where visitors who clicked an owner link came from (CAT-254); the page
/// maps its referrer or `?via=` to this fixed list.
enum HostAnalyticsTrafficSource {
  instagram,
  whatsapp,
  facebook,
  google,
  qr,
  email,
  direct,
  other,
}

/// Wire keys for [HostAnalyticsTrendPoint.metrics], as emitted by
/// `functions/src/analytics/hostAnalytics.ts`.
abstract final class HostAnalyticsTrendKeys {
  static const eventCount = 'eventCount';
  static const bookings = 'bookings';
  static const checkedIn = 'checkedIn';
  static const revenueMinor = 'revenueMinor';
  static const checkoutStarted = 'checkoutStarted';
  static const checkoutDropoff = 'checkoutDropoff';
  static const demand = 'demand';
  static const reviews = 'reviews';
  static const matches = 'matches';
  static const chats = 'chats';
  static const eventSaves = 'eventSaves';
  static const listingViews = 'listingViews';
  static const eventViews = 'eventViews';
  static const organizerSaves = 'organizerSaves';

  static const values = <String>{
    eventCount,
    bookings,
    checkedIn,
    revenueMinor,
    checkoutStarted,
    checkoutDropoff,
    demand,
    reviews,
    matches,
    chats,
    eventSaves,
    listingViews,
    eventViews,
    organizerSaves,
  };
}

/// Stable summary-card ids emitted by the host analytics callable.
abstract final class HostAnalyticsMetricIds {
  static const listingViews = 'listingViews';
  static const eventViews = 'eventViews';
  static const bookings = 'bookings';
  static const attendanceRate = 'attendanceRate';
  static const rosterGuests = 'rosterGuests';
  static const rosterAttendanceRate = 'rosterAttendanceRate';
  static const revenue = 'revenue';
  static const checkoutDropoff = 'checkoutDropoff';
  static const checkoutConversionRate = 'checkoutConversionRate';
  static const newReviews = 'newReviews';
  static const connections = 'connections';
  static const chats = 'chats';
  static const combinedViews = 'combinedViews';
  static const eventSaves = 'eventSaves';
}

class HostAnalyticsQuery {
  const HostAnalyticsQuery({
    this.clubId,
    this.eventId,
    this.rangePreset = HostAnalyticsRangePreset.thirtyDays,
    this.startDate,
    this.endDate,
    this.granularity,
    this.timezone,
  });

  final String? clubId;
  final String? eventId;
  final HostAnalyticsRangePreset rangePreset;
  final DateTime? startDate;
  final DateTime? endDate;
  final HostAnalyticsGranularity? granularity;
  final String? timezone;

  HostAnalyticsQueryCallableRequest toCallableRequest() =>
      HostAnalyticsQueryCallableRequest(
        clubId: clubId,
        eventId: eventId,
        rangePreset: rangePreset.wireValue,
        startDate: rangePreset == HostAnalyticsRangePreset.custom
            ? _dateOnlyString(startDate)
            : null,
        endDate: rangePreset == HostAnalyticsRangePreset.custom
            ? _dateOnlyString(endDate)
            : null,
        granularity: granularity?.wireValue,
        timezone: timezone,
      );

  @override
  bool operator ==(Object other) {
    return other is HostAnalyticsQuery &&
        other.clubId == clubId &&
        other.eventId == eventId &&
        other.rangePreset == rangePreset &&
        other.startDate == startDate &&
        other.endDate == endDate &&
        other.granularity == granularity &&
        other.timezone == timezone;
  }

  @override
  int get hashCode => Object.hash(
    clubId,
    eventId,
    rangePreset,
    startDate,
    endDate,
    granularity,
    timezone,
  );
}

class HostAnalyticsMetricCard {
  const HostAnalyticsMetricCard({
    required this.id,
    required this.label,
    required this.value,
    required this.unit,
    required this.status,
    this.caption,
    this.previousValue,
  });

  factory HostAnalyticsMetricCard.fromMap(Map<Object?, Object?> map) {
    return HostAnalyticsMetricCard(
      id: _string(map['id']),
      label: _string(map['label']),
      value: _num(map['value']),
      unit: _metricUnit(_string(map['unit'])),
      status: _metricStatus(_string(map['status'])),
      caption: _nullableString(map['caption']),
      previousValue: _nullableNum(map['previousValue']),
    );
  }

  final String id;
  final String label;
  final num value;
  final HostAnalyticsMetricUnit unit;
  final HostAnalyticsMetricStatus status;
  final String? caption;
  final num? previousValue;
}

class HostAnalyticsTrendPoint {
  const HostAnalyticsTrendPoint({
    required this.periodStart,
    required this.periodEnd,
    required this.metrics,
  });

  factory HostAnalyticsTrendPoint.fromMap(Map<Object?, Object?> map) {
    return HostAnalyticsTrendPoint(
      periodStart: _dateTime(map['periodStart']),
      periodEnd: _dateTime(map['periodEnd']),
      metrics: _numberMap(map['metrics']),
    );
  }

  final DateTime periodStart;
  final DateTime periodEnd;
  final Map<String, num> metrics;
}

class HostAnalyticsEventRow {
  const HostAnalyticsEventRow({
    required this.eventId,
    required this.clubId,
    required this.title,
    required this.startTime,
    required this.status,
    required this.bookedCount,
    required this.checkedInCount,
    required this.waitlistedCount,
    required this.fillRate,
    required this.checkInRate,
    required this.grossRevenueMinor,
    required this.currency,
    required this.checkoutStartedCount,
    required this.checkoutDropoffCount,
    required this.paymentCompletedCount,
    required this.paymentFailedCount,
    required this.paymentRefundedCount,
    required this.reviewCount,
    required this.averageRating,
    required this.demandCount,
    required this.inviteOpenCount,
    required this.mutualMatchCount,
    required this.chatStartedCount,
    required this.repeatAttendeeCount,
    this.operationalAttendeeCount = 0,
    this.operationalCheckedInCount = 0,
    this.attendeeSources = const {},
  });

  factory HostAnalyticsEventRow.fromMap(Map<Object?, Object?> map) {
    return HostAnalyticsEventRow(
      eventId: _string(map['eventId']),
      clubId: _string(map['clubId']),
      title: _string(map['title']),
      startTime: _dateTime(map['startTime']),
      status: _string(map['status'], fallback: 'unknown'),
      bookedCount: _int(map['bookedCount']),
      checkedInCount: _int(map['checkedInCount']),
      waitlistedCount: _int(map['waitlistedCount']),
      fillRate: _num(map['fillRate']),
      checkInRate: _num(map['checkInRate']),
      grossRevenueMinor: _int(map['grossRevenueMinor']),
      currency: _string(map['currency'], fallback: 'INR'),
      checkoutStartedCount: _int(map['checkoutStartedCount']),
      checkoutDropoffCount: _int(map['checkoutDropoffCount']),
      paymentCompletedCount: _int(map['paymentCompletedCount']),
      paymentFailedCount: _int(map['paymentFailedCount']),
      paymentRefundedCount: _int(map['paymentRefundedCount']),
      reviewCount: _int(map['reviewCount']),
      averageRating: _num(map['averageRating']),
      demandCount: _int(map['demandCount']),
      inviteOpenCount: _int(map['inviteOpenCount']),
      mutualMatchCount: _int(map['mutualMatchCount']),
      chatStartedCount: _int(map['chatStartedCount']),
      repeatAttendeeCount: _int(map['repeatAttendeeCount']),
      operationalAttendeeCount: _int(map['operationalAttendeeCount']),
      operationalCheckedInCount: _int(map['operationalCheckedInCount']),
      attendeeSources: _intMap(map['attendeeSources']),
    );
  }

  final String eventId;
  final String clubId;
  final String title;
  final DateTime startTime;
  final String status;
  final int bookedCount;
  final int checkedInCount;
  final int waitlistedCount;
  final num fillRate;
  final num checkInRate;
  final int grossRevenueMinor;
  final String currency;
  final int checkoutStartedCount;
  final int checkoutDropoffCount;
  final int paymentCompletedCount;
  final int paymentFailedCount;
  final int paymentRefundedCount;
  final int reviewCount;
  final num averageRating;
  final int demandCount;
  final int inviteOpenCount;
  final int mutualMatchCount;
  final int chatStartedCount;
  final int repeatAttendeeCount;
  final int operationalAttendeeCount;
  final int operationalCheckedInCount;
  final Map<String, int> attendeeSources;

  int get externalAttendeeCount =>
      (attendeeSources['hostImport'] ?? 0) +
      (attendeeSources['hostManual'] ?? 0) +
      (attendeeSources['webOtp'] ?? 0);
}

class HostAnalyticsReviewSummary {
  const HostAnalyticsReviewSummary({
    required this.newReviews,
    required this.publishedReviews,
    required this.verifiedReviews,
    required this.publicReviews,
    required this.ownerResponseCount,
    required this.averageRating,
  });

  factory HostAnalyticsReviewSummary.fromMap(Map<Object?, Object?> map) {
    return HostAnalyticsReviewSummary(
      newReviews: _int(map['newReviews']),
      publishedReviews: _int(map['publishedReviews']),
      verifiedReviews: _int(map['verifiedReviews']),
      publicReviews: _int(map['publicReviews']),
      ownerResponseCount: _int(map['ownerResponseCount']),
      averageRating: _num(map['averageRating']),
    );
  }

  final int newReviews;
  final int publishedReviews;
  final int verifiedReviews;
  final int publicReviews;
  final int ownerResponseCount;
  final num averageRating;
}

class HostAnalyticsDiscoverySummary {
  const HostAnalyticsDiscoverySummary({
    required this.listingViews,
    required this.searchAppearances,
    required this.eventViews,
    required this.organizerSaves,
    required this.eventSaves,
    required this.contactClicks,
    required this.claimClicks,
    required this.outboundClicks,
    this.linkClicks = 0,
  });

  factory HostAnalyticsDiscoverySummary.fromMap(Map<Object?, Object?> map) {
    return HostAnalyticsDiscoverySummary(
      listingViews: _int(map['listingViews']),
      searchAppearances: _int(map['searchAppearances']),
      eventViews: _int(map['eventViews']),
      organizerSaves: _int(map['organizerSaves']),
      eventSaves: _int(map['eventSaves']),
      contactClicks: _int(map['contactClicks']),
      claimClicks: _int(map['claimClicks']),
      outboundClicks: _int(map['outboundClicks']),
      linkClicks: _int(map['linkClicks']),
    );
  }

  final int listingViews;
  final int searchAppearances;
  final int eventViews;
  final int organizerSaves;
  final int eventSaves;
  final int contactClicks;
  final int claimClicks;
  final int outboundClicks;
  final int linkClicks;
}

/// One owner link's clicks in the range; [label] is null once it is removed.
class HostAnalyticsLinkClicks {
  const HostAnalyticsLinkClicks({
    required this.organizerId,
    required this.linkId,
    required this.label,
    required this.clicks,
  });

  factory HostAnalyticsLinkClicks.fromMap(Map<Object?, Object?> map) {
    final label = _string(map['label']);
    return HostAnalyticsLinkClicks(
      organizerId: _string(map['organizerId']),
      linkId: _string(map['linkId']),
      label: label.isEmpty ? null : label,
      clicks: _int(map['clicks']),
    );
  }

  final String organizerId;
  final String linkId;
  final String? label;
  final int clicks;
}

/// Owner link clicks by link, most clicked first, and by traffic source.
class HostAnalyticsLinkSummary {
  const HostAnalyticsLinkSummary({
    this.links = const [],
    this.trafficSources = const {},
  });

  factory HostAnalyticsLinkSummary.fromMap(Map<Object?, Object?> map) {
    final sources = <HostAnalyticsTrafficSource, int>{};
    for (final row in _mapList(map['trafficSources'], (row) => row)) {
      final source = HostAnalyticsTrafficSource.values
          .where((value) => value.name == _string(row['source']))
          .firstOrNull;
      if (source != null) sources[source] = _int(row['clicks']);
    }
    return HostAnalyticsLinkSummary(
      links: _mapList(map['links'], HostAnalyticsLinkClicks.fromMap),
      trafficSources: sources,
    );
  }

  final List<HostAnalyticsLinkClicks> links;

  /// Clicks per traffic source, most first.
  final Map<HostAnalyticsTrafficSource, int> trafficSources;
}

class HostAnalyticsDataQuality {
  const HostAnalyticsDataQuality({
    required this.id,
    required this.state,
    required this.detail,
  });

  factory HostAnalyticsDataQuality.fromMap(Map<Object?, Object?> map) {
    return HostAnalyticsDataQuality(
      id: _string(map['id']),
      state: _dataQualityState(_string(map['state'])),
      detail: _string(map['detail']),
    );
  }

  final String id;
  final HostAnalyticsDataQualityState state;
  final String detail;
}

class HostAnalyticsReport {
  const HostAnalyticsReport({
    required this.generatedAt,
    required this.summaryCards,
    required this.trend,
    required this.topEvents,
    required this.reviewSummary,
    required this.discoverySummary,
    required this.dataQuality,
    this.linkSummary = const HostAnalyticsLinkSummary(),
    this.timezone = 'UTC',
  });

  factory HostAnalyticsReport.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      return HostAnalyticsReport(
        generatedAt: _dateTime(map['generatedAt']),
        summaryCards: _mapList(
          map['summaryCards'],
          HostAnalyticsMetricCard.fromMap,
        ),
        trend: _mapList(map['trend'], HostAnalyticsTrendPoint.fromMap),
        topEvents: _mapList(map['topEvents'], HostAnalyticsEventRow.fromMap),
        reviewSummary: HostAnalyticsReviewSummary.fromMap(
          _map(map['reviewSummary']),
        ),
        discoverySummary: HostAnalyticsDiscoverySummary.fromMap(
          _map(map['discoverySummary']),
        ),
        dataQuality: _mapList(
          map['dataQuality'],
          HostAnalyticsDataQuality.fromMap,
        ),
        linkSummary: HostAnalyticsLinkSummary.fromMap(_map(map['linkSummary'])),
        timezone: _string(map['timezone'], fallback: 'UTC'),
      );
    }
    throw const FormatException('Invalid host analytics response.');
  }

  final DateTime generatedAt;
  final List<HostAnalyticsMetricCard> summaryCards;
  final List<HostAnalyticsTrendPoint> trend;
  final List<HostAnalyticsEventRow> topEvents;
  final HostAnalyticsReviewSummary reviewSummary;
  final HostAnalyticsDiscoverySummary discoverySummary;
  final List<HostAnalyticsDataQuality> dataQuality;
  final HostAnalyticsLinkSummary linkSummary;
  final String timezone;
}

class HostAnalyticsRepository {
  const HostAnalyticsRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('getHostAnalytics')
              .call(query.toCallableRequest().toJson());
          return HostAnalyticsReport.fromCallableData(result.data);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load host analytics',
          resource: 'getHostAnalytics',
        ),
      );
}

@riverpod
HostAnalyticsRepository hostAnalyticsRepository(Ref ref) {
  return HostAnalyticsRepository(ref.watch(firebaseFunctionsProvider));
}

@riverpod
Future<HostAnalyticsReport> hostAnalytics(
  Ref ref,
  HostAnalyticsQuery query,
) async {
  // Auth transitions invalidate this read even when its tab cache is retained.
  // The disposed read's Ref also fences sign-out/re-entry to the same UID.
  final auth = ref.watch(uidProvider);
  final uid = !auth.isLoading && !auth.hasError ? auth.asData?.value : null;
  if (uid == null || uid.isEmpty) {
    throw const SignInRequiredException('load host analytics');
  }
  final report = await ref
      .watch(hostAnalyticsRepositoryProvider)
      .getHostAnalytics(query);
  if (!ref.mounted) {
    throw const SignInRequiredException('load host analytics');
  }
  final current = ref.read(uidProvider);
  if (current.isLoading || current.hasError || current.asData?.value != uid) {
    throw const SignInRequiredException('load host analytics');
  }
  // Auto-dispose at tab exit: a paused cache cannot observe every auth
  // transition. Reopening always requires fresh server authorization.
  return report;
}

Map<Object?, Object?> _map(Object? value) =>
    value is Map<Object?, Object?> ? value : const {};

List<T> _mapList<T>(
  Object? value,
  T Function(Map<Object?, Object?> map) mapper,
) {
  if (value is! List<Object?>) return const [];
  return [
    for (final item in value)
      if (item is Map<Object?, Object?>) mapper(item),
  ];
}

Map<String, num> _numberMap(Object? value) {
  if (value is! Map<Object?, Object?>) return const {};
  return {
    for (final entry in value.entries)
      if (entry.key case final String key)
        if (entry.value case final num number) key: number,
  };
}

Map<String, int> _intMap(Object? value) {
  if (value is! Map<Object?, Object?>) return const {};
  return {
    for (final entry in value.entries)
      if (entry.key case final String key)
        if (entry.value case final num number) key: number.round(),
  };
}

String _string(Object? value, {String fallback = ''}) =>
    value is String ? value : fallback;

String? _nullableString(Object? value) => value is String ? value : null;

int _int(Object? value) => value is num ? value.round() : 0;

num _num(Object? value) => value is num ? value : 0;

num? _nullableNum(Object? value) => value is num ? value : null;

DateTime _dateTime(Object? value) {
  if (value is String) return DateTime.tryParse(value) ?? DateTime(1970);
  return DateTime(1970);
}

String? _dateOnlyString(DateTime? value) {
  if (value == null) return null;
  final normalized = DateUtils.dateOnly(value);
  final month = normalized.month.toString().padLeft(2, '0');
  final day = normalized.day.toString().padLeft(2, '0');
  return '${normalized.year}-$month-$day';
}

HostAnalyticsMetricUnit _metricUnit(String value) => switch (value) {
  'percent' => HostAnalyticsMetricUnit.percent,
  'money_minor' => HostAnalyticsMetricUnit.moneyMinor,
  'rating' => HostAnalyticsMetricUnit.rating,
  _ => HostAnalyticsMetricUnit.count,
};

HostAnalyticsMetricStatus _metricStatus(String value) => switch (value) {
  'partial' => HostAnalyticsMetricStatus.partial,
  'missing' => HostAnalyticsMetricStatus.missing,
  _ => HostAnalyticsMetricStatus.ready,
};

HostAnalyticsDataQualityState _dataQualityState(String value) =>
    switch (value) {
      'partial' => HostAnalyticsDataQualityState.partial,
      'missing' => HostAnalyticsDataQualityState.missing,
      _ => HostAnalyticsDataQualityState.ok,
    };
