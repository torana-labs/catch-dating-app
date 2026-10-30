// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/validate_organizer_manual_send_task_launch_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-bound, read-only authority check immediately before re-opening an external handoff.
final class ValidateOrganizerManualSendTaskLaunchCallableRequest {
  const ValidateOrganizerManualSendTaskLaunchCallableRequest({
    required this.organizerId,
    required this.taskId,
    required this.expectedRevision,
  });

  final String organizerId;
  final String taskId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'taskId': taskId,
    'expectedRevision': expectedRevision,
  };
}
