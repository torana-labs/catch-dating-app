// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/prepare_event_success_rotation_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-fenced payload accepted by generateEventSuccessRotations when preparing the next host-only round.
final class PrepareEventSuccessRotationDraftCallableRequest {
  const PrepareEventSuccessRotationDraftCallableRequest({
    required this.eventId,
    required this.expectedRevision,
  });

  final String eventId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedRevision': expectedRevision,
  };
}
