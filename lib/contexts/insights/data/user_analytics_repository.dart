import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart' show DateUtils;
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_analytics_repository.g.dart';

enum UserAnalyticsRangePreset {
  sevenDays('7d'),
  thirtyDays('30d'),
  ninetyDays('90d'),
  month('month'),
  custom('custom');

  const UserAnalyticsRangePreset(this.wireValue);

  final String wireValue;
}

enum UserAnalyticsGranularity {
  day('day'),
  week('week'),
  month('month');

  const UserAnalyticsGranularity(this.wireValue);

  final String wireValue;
}

enum UserAnalyticsMetricUnit { count, percent, durationSeconds }

enum UserAnalyticsMetricStatus { ready, partial, missing }

enum UserAnalyticsDataQualityState { ok, partial, missing }

class UserAnalyticsQuery {
  const UserAnalyticsQuery({
    this.rangePreset = UserAnalyticsRangePreset.thirtyDays,
    this.startDate,
    this.endDate,
    this.granularity,
  });

  final UserAnalyticsRangePreset rangePreset;
  final DateTime? startDate;
  final DateTime? endDate;
  final UserAnalyticsGranularity? granularity;

  UserAnalyticsQueryCallableRequest toCallableRequest() =>
      UserAnalyticsQueryCallableRequest(
        rangePreset: rangePreset.wireValue,
        startDate: rangePreset == UserAnalyticsRangePreset.custom
            ? _dateOnlyString(startDate)
            : null,
        endDate: rangePreset == UserAnalyticsRangePreset.custom
            ? _dateOnlyString(endDate)
            : null,
        granularity: granularity?.wireValue,
      );

  @override
  bool operator ==(Object other) {
    return other is UserAnalyticsQuery &&
        other.rangePreset == rangePreset &&
        DateUtils.isSameDay(other.startDate, startDate) &&
        DateUtils.isSameDay(other.endDate, endDate) &&
        other.granularity == granularity;
  }

  @override
  int get hashCode => Object.hash(
    rangePreset,
    _dateOnlyString(startDate),
    _dateOnlyString(endDate),
    granularity,
  );
}

class UserAnalyticsMetricCard {
  const UserAnalyticsMetricCard({
    required this.id,
    required this.label,
    required this.value,
    required this.unit,
    required this.status,
    this.caption,
  });

  factory UserAnalyticsMetricCard.fromMap(Map<Object?, Object?> map) {
    return UserAnalyticsMetricCard(
      id: _string(map['id']),
      label: _string(map['label']),
      value: _num(map['value']),
      unit: _metricUnit(_string(map['unit'])),
      status: _metricStatus(_string(map['status'])),
      caption: _nullableString(map['caption']),
    );
  }

  final String id;
  final String label;
  final num value;
  final UserAnalyticsMetricUnit unit;
  final UserAnalyticsMetricStatus status;
  final String? caption;
}

class UserAnalyticsTrendPoint {
  const UserAnalyticsTrendPoint({
    required this.periodStart,
    required this.periodEnd,
    required this.metrics,
  });

  factory UserAnalyticsTrendPoint.fromMap(Map<Object?, Object?> map) {
    return UserAnalyticsTrendPoint(
      periodStart: _dateTime(map['periodStart']),
      periodEnd: _dateTime(map['periodEnd']),
      metrics: _numberMap(map['metrics']),
    );
  }

  final DateTime periodStart;
  final DateTime periodEnd;
  final Map<String, num> metrics;
}

class UserAnalyticsConnectionSummary {
  const UserAnalyticsConnectionSummary({
    required this.outgoingLikes,
    required this.incomingLikes,
    required this.privateInterestReceived,
    required this.mutualCatches,
    required this.chatsStarted,
    required this.chatMessagesSent,
    required this.followThroughRate,
    required this.eventsAttended,
  });

  factory UserAnalyticsConnectionSummary.fromMap(Map<Object?, Object?> map) {
    return UserAnalyticsConnectionSummary(
      outgoingLikes: _int(map['outgoingLikes']),
      incomingLikes: _int(map['incomingLikes']),
      privateInterestReceived: _int(map['privateInterestReceived']),
      mutualCatches: _int(map['mutualCatches']),
      chatsStarted: _int(map['chatsStarted']),
      chatMessagesSent: _int(map['chatMessagesSent']),
      followThroughRate: _num(map['followThroughRate']),
      eventsAttended: _int(map['eventsAttended']),
    );
  }

  final int outgoingLikes;
  final int incomingLikes;
  final int privateInterestReceived;
  final int mutualCatches;
  final int chatsStarted;
  final int chatMessagesSent;
  final num followThroughRate;
  final int eventsAttended;
}

class UserAnalyticsProfileSummary {
  const UserAnalyticsProfileSummary({
    required this.profileViews,
    required this.uniqueViewers,
    required this.profileDwellSeconds,
    required this.photoImpressions,
    required this.topPhotoId,
    required this.activeMinutes,
  });

  factory UserAnalyticsProfileSummary.fromMap(Map<Object?, Object?> map) {
    return UserAnalyticsProfileSummary(
      profileViews: _int(map['profileViews']),
      uniqueViewers: _int(map['uniqueViewers']),
      profileDwellSeconds: _int(map['profileDwellSeconds']),
      photoImpressions: _int(map['photoImpressions']),
      topPhotoId: _nullableString(map['topPhotoId']),
      activeMinutes: _int(map['activeMinutes']),
    );
  }

  final int profileViews;
  final int uniqueViewers;
  final int profileDwellSeconds;
  final int photoImpressions;
  final String? topPhotoId;
  final int activeMinutes;
}

class UserAnalyticsCoachingTipRef {
  const UserAnalyticsCoachingTipRef({
    required this.id,
    required this.copyKey,
    required this.priority,
    required this.metricIds,
  });

  factory UserAnalyticsCoachingTipRef.fromMap(Map<Object?, Object?> map) {
    return UserAnalyticsCoachingTipRef(
      id: _string(map['id']),
      copyKey: _string(map['copyKey']),
      priority: _int(map['priority']),
      metricIds: _stringList(map['metricIds']),
    );
  }

  final String id;
  final String copyKey;
  final int priority;
  final List<String> metricIds;
}

class UserAnalyticsDataQuality {
  const UserAnalyticsDataQuality({
    required this.id,
    required this.state,
    required this.detail,
  });

  factory UserAnalyticsDataQuality.fromMap(Map<Object?, Object?> map) {
    return UserAnalyticsDataQuality(
      id: _string(map['id']),
      state: _dataQualityState(_string(map['state'])),
      detail: _string(map['detail']),
    );
  }

  final String id;
  final UserAnalyticsDataQualityState state;
  final String detail;
}

class UserAnalyticsReport {
  const UserAnalyticsReport({
    required this.generatedAt,
    required this.summaryCards,
    required this.trend,
    required this.connectionSummary,
    required this.profileSummary,
    required this.coachingTipRefs,
    required this.dataQuality,
  });

  factory UserAnalyticsReport.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      return UserAnalyticsReport(
        generatedAt: _dateTime(map['generatedAt']),
        summaryCards: _mapList(
          map['summaryCards'],
          UserAnalyticsMetricCard.fromMap,
        ),
        trend: _mapList(map['trend'], UserAnalyticsTrendPoint.fromMap),
        connectionSummary: UserAnalyticsConnectionSummary.fromMap(
          _map(map['connectionSummary']),
        ),
        profileSummary: UserAnalyticsProfileSummary.fromMap(
          _map(map['profileSummary']),
        ),
        coachingTipRefs: _mapList(
          map['coachingTipRefs'],
          UserAnalyticsCoachingTipRef.fromMap,
        ),
        dataQuality: _mapList(
          map['dataQuality'],
          UserAnalyticsDataQuality.fromMap,
        ),
      );
    }
    throw const FormatException('Invalid user analytics response.');
  }

  final DateTime generatedAt;
  final List<UserAnalyticsMetricCard> summaryCards;
  final List<UserAnalyticsTrendPoint> trend;
  final UserAnalyticsConnectionSummary connectionSummary;
  final UserAnalyticsProfileSummary profileSummary;
  final List<UserAnalyticsCoachingTipRef> coachingTipRefs;
  final List<UserAnalyticsDataQuality> dataQuality;
}

class UserAnalyticsRepository {
  const UserAnalyticsRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<UserAnalyticsReport> getUserAnalytics(UserAnalyticsQuery query) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('getUserAnalytics')
              .call(query.toCallableRequest().toJson());
          return UserAnalyticsReport.fromCallableData(result.data);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load user analytics',
          resource: 'getUserAnalytics',
        ),
      );
}

@riverpod
UserAnalyticsRepository userAnalyticsRepository(Ref ref) {
  return UserAnalyticsRepository(ref.watch(firebaseFunctionsProvider));
}

@riverpod
Future<UserAnalyticsReport> userAnalytics(Ref ref, UserAnalyticsQuery query) {
  return ref.watch(userAnalyticsRepositoryProvider).getUserAnalytics(query);
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

List<String> _stringList(Object? value) {
  if (value is! List<Object?>) return const [];
  return [
    for (final item in value)
      if (item is String) item,
  ];
}

String _string(Object? value, {String fallback = ''}) =>
    value is String ? value : fallback;

String? _nullableString(Object? value) => value is String ? value : null;

int _int(Object? value) => value is num ? value.round() : 0;

num _num(Object? value) => value is num ? value : 0;

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

UserAnalyticsMetricUnit _metricUnit(String value) => switch (value) {
  'percent' => UserAnalyticsMetricUnit.percent,
  'duration_seconds' => UserAnalyticsMetricUnit.durationSeconds,
  _ => UserAnalyticsMetricUnit.count,
};

UserAnalyticsMetricStatus _metricStatus(String value) => switch (value) {
  'partial' => UserAnalyticsMetricStatus.partial,
  'missing' => UserAnalyticsMetricStatus.missing,
  _ => UserAnalyticsMetricStatus.ready,
};

UserAnalyticsDataQualityState _dataQualityState(String value) =>
    switch (value) {
      'partial' => UserAnalyticsDataQualityState.partial,
      'missing' => UserAnalyticsDataQualityState.missing,
      _ => UserAnalyticsDataQualityState.ok,
    };
