// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_refresh_organizer_events_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Staff read new events for an unclaimed organizer Catch already lists: Supply Intake reads the given links, or the event-calendar links on the organizer's page, and its events go through the event publication policy like an approved listing's.
final class AdminRefreshOrganizerEventsCallableRequest {
  const AdminRefreshOrganizerEventsCallableRequest({
    required this.requestId,
    required this.organizerId,
    required this.urls,
  });

  final String requestId;
  final String organizerId;
  final List<String> urls;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'organizerId': organizerId,
    'urls': urls,
  };
}
