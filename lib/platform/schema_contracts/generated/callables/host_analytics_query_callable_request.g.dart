// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/host_analytics_query_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by getHostAnalytics and adminGetHostAnalytics.
final class HostAnalyticsQueryCallableRequest {
  const HostAnalyticsQueryCallableRequest({
    this.clubId,
    this.organizerId,
    this.eventId,
    this.rangePreset,
    this.startDate,
    this.endDate,
    this.granularity,
    this.timezone,
  });

  final String? clubId;
  final String? organizerId;
  final String? eventId;
  final String? rangePreset;
  final String? startDate;
  final String? endDate;
  final String? granularity;
  final String? timezone;

  Map<String, Object?> toJson() => {
    'clubId': ?clubId,
    'organizerId': ?organizerId,
    'eventId': ?eventId,
    'rangePreset': ?rangePreset,
    'startDate': ?startDate,
    'endDate': ?endDate,
    'granularity': ?granularity,
    'timezone': ?timezone,
  };
}
