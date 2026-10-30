// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_apply_event_messaging_budget_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Stages one still-current approved event-messaging budget decision as paused event and sender-day ceilings. The operation grants no spending or dispatch authority and cannot activate a worker.
final class AdminApplyEventMessagingBudgetCallableRequest {
  const AdminApplyEventMessagingBudgetCallableRequest({
    required this.requestId,
    required this.decisionId,
    required this.expectedDecisionRevision,
    required this.note,
  });

  final String requestId;
  final String decisionId;
  final int expectedDecisionRevision;
  final String note;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'decisionId': decisionId,
    'expectedDecisionRevision': expectedDecisionRevision,
    'note': note,
  };
}
