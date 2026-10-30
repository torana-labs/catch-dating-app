// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/manage_organizer_form_payment_connection_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only merchant connection setup, safe listing, credential refresh, and local disconnection.
final class ManageOrganizerFormPaymentConnectionCallableRequest {
  const ManageOrganizerFormPaymentConnectionCallableRequest({
    required this.organizerId,
    required this.action,
    required this.connectionId,
  });

  final String organizerId;
  final String action;
  final String? connectionId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'action': action,
    'connectionId': connectionId,
  };
}
