// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/inject_event_rehearsal_behavior_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Applies a deterministic synthetic-actor behavior or an internal-only fault.
final class InjectEventRehearsalBehaviorCallableRequest {
  const InjectEventRehearsalBehaviorCallableRequest({
    required this.sessionId,
    required this.expectedRevision,
    required this.clientActionId,
    required this.actorId,
    required this.behavior,
    required this.faultId,
  });

  final String sessionId;
  final int expectedRevision;
  final String clientActionId;
  final String? actorId;
  final String? behavior;
  final String faultId;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'expectedRevision': expectedRevision,
    'clientActionId': clientActionId,
    'actorId': actorId,
    'behavior': behavior,
    'faultId': faultId,
  };
}
