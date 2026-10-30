// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/complete_organizer_whatsapp_connection_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Server-side completion of Meta Embedded Signup using the short-lived authorization code returned to the Host surface.
final class CompleteOrganizerWhatsappConnectionCallableRequest {
  const CompleteOrganizerWhatsappConnectionCallableRequest({
    required this.organizerId,
    required this.authorizationCode,
    required this.wabaId,
    required this.phoneNumberId,
    this.businessId,
  });

  final String organizerId;
  final String authorizationCode;
  final String wabaId;
  final String phoneNumberId;
  final String? businessId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'authorizationCode': authorizationCode,
    'wabaId': wabaId,
    'phoneNumberId': phoneNumberId,
    'businessId': ?businessId,
  };
}
