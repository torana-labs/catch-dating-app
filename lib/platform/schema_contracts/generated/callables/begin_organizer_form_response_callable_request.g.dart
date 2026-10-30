// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/begin_organizer_form_response_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Starts or idempotently resumes a version-bound response draft.
final class BeginOrganizerFormResponseCallableRequest {
  const BeginOrganizerFormResponseCallableRequest({
    required this.publicFormId,
    required this.sourceToken,
    required this.requestId,
    this.reuseResponseId,
  });

  final String publicFormId;
  final String? sourceToken;
  final String requestId;
  final String? reuseResponseId;

  Map<String, Object?> toJson() => {
    'publicFormId': publicFormId,
    'sourceToken': sourceToken,
    'requestId': requestId,
    'reuseResponseId': ?reuseResponseId,
  };
}
