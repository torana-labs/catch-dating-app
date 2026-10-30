// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/sync_organizer_provider_event_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Idempotent manager request to reconcile one mapped external event into the Catch operational roster.
final class SyncOrganizerProviderEventCallableRequest {
  const SyncOrganizerProviderEventCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.clientOperationId,
  });

  final String organizerId;
  final String eventId;
  final String clientOperationId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'clientOperationId': clientOperationId,
  };
}
