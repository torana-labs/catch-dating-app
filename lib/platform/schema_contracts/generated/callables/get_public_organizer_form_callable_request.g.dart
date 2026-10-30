// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_public_organizer_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Resolves one bounded public form projection.
final class GetPublicOrganizerFormCallableRequest {
  const GetPublicOrganizerFormCallableRequest({
    required this.publicFormId,
    required this.sourceToken,
  });

  final String publicFormId;
  final String? sourceToken;

  Map<String, Object?> toJson() => {
    'publicFormId': publicFormId,
    'sourceToken': sourceToken,
  };
}
