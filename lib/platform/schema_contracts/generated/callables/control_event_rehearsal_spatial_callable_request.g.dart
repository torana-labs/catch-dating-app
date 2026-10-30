// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/control_event_rehearsal_spatial_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Previews or persists one synthetic actor placement inside an isolated dress rehearsal.
final class ControlEventRehearsalSpatialCallableRequest {
  const ControlEventRehearsalSpatialCallableRequest({
    required this.sessionId,
    required this.expectedRevision,
    required this.clientActionId,
    required this.actorId,
    required this.action,
    required this.destinationUnitId,
    required this.scope,
  });

  final String sessionId;
  final int expectedRevision;
  final String clientActionId;
  final String actorId;
  final String action;
  final String? destinationUnitId;
  final String? scope;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'expectedRevision': expectedRevision,
    'clientActionId': clientActionId,
    'actorId': actorId,
    'action': action,
    'destinationUnitId': destinationUnitId,
    'scope': scope,
  };
}
