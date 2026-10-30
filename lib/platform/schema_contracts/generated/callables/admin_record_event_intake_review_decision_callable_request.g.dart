// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_record_event_intake_review_decision_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminRecordEventIntakeReviewDecision. This records a manual admin decision for private event-intake artifacts without publishing marketing content or creating canonical events.
final class AdminRecordEventIntakeReviewDecisionCallableRequest {
  const AdminRecordEventIntakeReviewDecisionCallableRequest({
    required this.targetType,
    required this.targetId,
    required this.decision,
    this.runId,
    required this.note,
    this.edits,
    required this.checklist,
  });

  final String targetType;
  final String targetId;
  final String decision;
  final String? runId;
  final String note;
  final Map<String, Object?>? edits;
  final Map<String, Object?> checklist;

  Map<String, Object?> toJson() => {
    'targetType': targetType,
    'targetId': targetId,
    'decision': decision,
    'runId': ?runId,
    'note': note,
    'edits': ?edits,
    'checklist': checklist,
  };
}
