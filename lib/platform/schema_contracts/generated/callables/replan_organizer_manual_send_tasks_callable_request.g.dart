// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/replan_organizer_manual_send_tasks_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Explicitly rechecks current communication routes for active manual work without mutating, dispatching, or completing it.
final class ReplanOrganizerManualSendTasksCallableRequest {
  const ReplanOrganizerManualSendTasksCallableRequest({
    required this.organizerId,
    required this.taskIds,
  });

  final String organizerId;
  final List<String> taskIds;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'taskIds': taskIds,
  };
}
