// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_form_share_link_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates an idempotent source-attributed link for a published form.
final class CreateOrganizerFormShareLinkCallableRequest {
  const CreateOrganizerFormShareLinkCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.label,
    required this.source,
    required this.requestId,
  });

  final String organizerId;
  final String formId;
  final String label;
  final String? source;
  final String requestId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'label': label,
    'source': source,
    'requestId': requestId,
  };
}
