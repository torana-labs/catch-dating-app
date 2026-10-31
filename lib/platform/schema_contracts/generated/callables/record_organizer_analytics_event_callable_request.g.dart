// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/record_organizer_analytics_event_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Public website analytics event for host-visible organizer metrics. The callable validates organizer scope and writes a raw, aggregate-safe event to BigQuery.
final class RecordOrganizerAnalyticsEventCallableRequest {
  const RecordOrganizerAnalyticsEventCallableRequest({
    required this.organizerId,
    this.eventId,
    required this.eventName,
    this.linkId,
    this.trafficSource,
    required this.pagePath,
    this.source,
    this.sessionId,
    this.platform,
  });

  final String organizerId;
  final String? eventId;
  final String eventName;
  final String? linkId;
  final String? trafficSource;
  final String pagePath;
  final String? source;
  final String? sessionId;
  final String? platform;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': ?eventId,
    'eventName': eventName,
    'linkId': ?linkId,
    'trafficSource': ?trafficSource,
    'pagePath': pagePath,
    'source': ?source,
    'sessionId': ?sessionId,
    'platform': ?platform,
  };
}
