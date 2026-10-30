// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/open_organizer_manual_send_task_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-bound acknowledgement that the device accepted the external handoff.
final class OpenOrganizerManualSendTaskCallableRequest {
  const OpenOrganizerManualSendTaskCallableRequest({
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
