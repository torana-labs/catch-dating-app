// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_takedown_external_event_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminTakedownExternalEvent. Dry-run validates and receipts a reviewed takedown; apply removes the external event from discovery without deleting audit history.
final class AdminTakedownExternalEventCallableRequest {
  const AdminTakedownExternalEventCallableRequest({
    required this.eventId,
    required this.executionMode,
    required this.idempotencyKey,
    required this.reviewNote,
    required this.checklist,
  });

  final String eventId;
  final String executionMode;
  final String idempotencyKey;
  final String reviewNote;
  final Map<String, Object?> checklist;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'executionMode': executionMode,
    'idempotencyKey': idempotencyKey,
    'reviewNote': reviewNote,
    'checklist': checklist,
  };
}
