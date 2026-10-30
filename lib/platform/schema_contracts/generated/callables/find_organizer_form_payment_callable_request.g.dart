// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/find_organizer_form_payment_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Find the signed-in respondent's most recent payment for a public form without browser-local identifiers.
final class FindOrganizerFormPaymentCallableRequest {
  const FindOrganizerFormPaymentCallableRequest({
    required this.publicFormId,
  });

  final String publicFormId;

  Map<String, Object?> toJson() => {
    'publicFormId': publicFormId,
  };
}
