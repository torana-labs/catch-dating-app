// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_private_event_setup_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class CreatePrivateEventSetupCallableRequest {
  const CreatePrivateEventSetupCallableRequest({
    required this.organizerId,
    required this.requestId,
    required this.basics,
  });

  final String organizerId;
  final String requestId;
  final Map<String, Object?> basics;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'basics': basics,
  };
}
