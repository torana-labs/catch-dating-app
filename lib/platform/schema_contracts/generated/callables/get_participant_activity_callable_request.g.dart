// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_participant_activity_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Read the authenticated account's owned form submissions without profile claiming.
final class GetParticipantActivityCallableRequest {
  const GetParticipantActivityCallableRequest({
    required this.sourceKind,
    required this.sourceId,
  });

  final String sourceKind;
  final String sourceId;

  Map<String, Object?> toJson() => {
    'sourceKind': sourceKind,
    'sourceId': sourceId,
  };
}
