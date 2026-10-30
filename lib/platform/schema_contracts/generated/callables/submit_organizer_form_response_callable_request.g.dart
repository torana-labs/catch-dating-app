// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_organizer_form_response_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Idempotently submits one completed version-bound draft.
final class SubmitOrganizerFormResponseCallableRequest {
  const SubmitOrganizerFormResponseCallableRequest({
    required this.draftId,
    required this.draftToken,
    required this.expectedRevision,
    required this.requestId,
  });

  final String draftId;
  final String? draftToken;
  final int expectedRevision;
  final String requestId;

  Map<String, Object?> toJson() => {
    'draftId': draftId,
    'draftToken': draftToken,
    'expectedRevision': expectedRevision,
    'requestId': requestId,
  };
}
