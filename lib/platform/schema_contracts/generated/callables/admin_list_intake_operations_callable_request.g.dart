// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_intake_operations_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Read-only filters for the durable Supply Intake operations inventory. This callable never requests or executes a run.
final class AdminListIntakeOperationsCallableRequest {
  const AdminListIntakeOperationsCallableRequest({
    this.workflowId,
    this.runId,
    this.primaryStage,
    this.entityKind,
    this.lifecycleStatus,
    this.runStatus,
    this.humanReviewRequired,
    this.runLimit,
    this.workItemLimit,
    this.runCursor,
    this.workItemCursor,
  });

  final String? workflowId;
  final String? runId;
  final String? primaryStage;
  final String? entityKind;
  final String? lifecycleStatus;
  final String? runStatus;
  final bool? humanReviewRequired;
  final int? runLimit;
  final int? workItemLimit;
  final String? runCursor;
  final String? workItemCursor;

  Map<String, Object?> toJson() => {
    'workflowId': ?workflowId,
    'runId': ?runId,
    'primaryStage': ?primaryStage,
    'entityKind': ?entityKind,
    'lifecycleStatus': ?lifecycleStatus,
    'runStatus': ?runStatus,
    'humanReviewRequired': ?humanReviewRequired,
    'runLimit': ?runLimit,
    'workItemLimit': ?workItemLimit,
    'runCursor': ?runCursor,
    'workItemCursor': ?workItemCursor,
  };
}
