// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/user_analytics_query_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by getUserAnalytics and adminGetUserAnalytics.
final class UserAnalyticsQueryCallableRequest {
  const UserAnalyticsQueryCallableRequest({
    this.userId,
    this.rangePreset,
    this.startDate,
    this.endDate,
    this.granularity,
  });

  final String? userId;
  final String? rangePreset;
  final String? startDate;
  final String? endDate;
  final String? granularity;

  Map<String, Object?> toJson() => {
    'userId': ?userId,
    'rangePreset': ?rangePreset,
    'startDate': ?startDate,
    'endDate': ?endDate,
    'granularity': ?granularity,
  };
}
