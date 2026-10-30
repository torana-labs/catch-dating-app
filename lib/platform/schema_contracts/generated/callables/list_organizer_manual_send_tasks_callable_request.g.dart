// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_manual_send_tasks_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists a bounded organizer manual-send queue or history page.
final class ListOrganizerManualSendTasksCallableRequest {
  const ListOrganizerManualSendTasksCallableRequest({
    required this.organizerId,
    this.activeOnly,
    this.limit,
    this.cursor,
  });

  final String organizerId;
  final bool? activeOnly;
  final int? limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'activeOnly': ?activeOnly,
    'limit': ?limit,
    'cursor': ?cursor,
  };
}
