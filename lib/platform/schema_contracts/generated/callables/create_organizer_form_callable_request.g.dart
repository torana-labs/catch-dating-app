// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates one organizer-owned generic form draft from a versioned template.
final class CreateOrganizerFormCallableRequest {
  const CreateOrganizerFormCallableRequest({
    required this.organizerId,
    required this.templateId,
    required this.requestId,
    required this.title,
    required this.defaultTargetKind,
    required this.defaultTargetId,
  });

  final String organizerId;
  final String templateId;
  final String requestId;
  final String? title;
  final String defaultTargetKind;
  final String? defaultTargetId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'templateId': templateId,
    'requestId': requestId,
    'title': title,
    'defaultTargetKind': defaultTargetKind,
    'defaultTargetId': defaultTargetId,
  };
}
