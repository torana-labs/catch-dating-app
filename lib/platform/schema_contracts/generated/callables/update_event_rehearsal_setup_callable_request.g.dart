// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_event_rehearsal_setup_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-fenced update to safe rehearsal-only event and playbook setup.
final class UpdateEventRehearsalSetupCallableRequest {
  const UpdateEventRehearsalSetupCallableRequest({
    required this.sessionId,
    required this.expectedRevision,
    required this.scenarioId,
    required this.actorCount,
    required this.setup,
  });

  final String sessionId;
  final int expectedRevision;
  final String scenarioId;
  final int actorCount;
  final Map<String, Object?> setup;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'expectedRevision': expectedRevision,
    'scenarioId': scenarioId,
    'actorCount': actorCount,
    'setup': setup,
  };
}
