// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/mark_organizer_manual_send_task_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-bound explicit terminal host action for one manual-send task.
final class MarkOrganizerManualSendTaskCallableRequest {
  const MarkOrganizerManualSendTaskCallableRequest({
    required this.organizerId,
    required this.taskId,
    required this.expectedRevision,
    required this.action,
  });

  final String organizerId;
  final String taskId;
  final int expectedRevision;
  final String action;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'taskId': taskId,
    'expectedRevision': expectedRevision,
    'action': action,
  };
}
