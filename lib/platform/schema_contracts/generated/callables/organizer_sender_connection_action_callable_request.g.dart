// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/organizer_sender_connection_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager action on one organizer-owned messaging connection.
final class OrganizerSenderConnectionActionCallableRequest {
  const OrganizerSenderConnectionActionCallableRequest({
    required this.organizerId,
    this.connectionId,
  });

  final String organizerId;
  final String? connectionId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'connectionId': ?connectionId,
  };
}
